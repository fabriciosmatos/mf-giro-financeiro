import React from 'react';
import { Devedor } from '../types';
import { formatarMoeda, cn } from '../lib/utils';
import { MessageCircle, ArrowUpCircle, ArrowDownCircle, History, CalendarClock, Pencil, X, MoreVertical, TrendingUp } from 'lucide-react';
import { calcularJurosDoPeriodo, calcularMesesDevidos, calcularJurosAcumulados, calcularDetalhamento } from '../lib/financeiro/juros';
import { getProximoVencimento, getInfoStatus } from '../lib/financeiro/statusLogic';

interface DevedorCardProps {
  devedor: Devedor;
  onPagar: (d: Devedor) => void;
  onAporte: (d: Devedor) => void;
  onVerHistorico: (d: Devedor) => void;
  onEditar: (d: Devedor) => void;
  onExcluir: (d: Devedor) => void;
}

export const DevedorCard: React.FC<DevedorCardProps> = ({ devedor, onPagar, onAporte, onVerHistorico, onEditar, onExcluir }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const iniciais = devedor.nomeCompleto.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const diaVencimento = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date(devedor.dataCriacao).getDate());
  
  // Cálculo de meses devidos
  const dataReferencia = devedor.ultimoPagamento 
    ? (devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento))
    : (devedor.dataCriacao 
        ? (devedor.dataCriacao.toDate ? devedor.dataCriacao.toDate() : new Date(devedor.dataCriacao))
        : new Date()
      );
  
  const detalhe = calcularDetalhamento(diaVencimento, dataReferencia, devedor.saldoDevedorAtual, devedor.taxaJurosMensal);
  const mesesDevidos = detalhe.mesesDevidos;
  const jurosAcumulados = detalhe.jurosAcumulados;
  const jurosMensalSimples = calcularJurosDoPeriodo(devedor.saldoDevedorAtual, devedor.taxaJurosMensal);

  const status = getInfoStatus(devedor);
  
  // Lógica de exibição de data de vencimento/atraso
  let dataExibicao = detalhe.dataPrimeiroVencimento;
  let labelData = "Vencimento";

  if (devedor.saldoDevedorAtual > 0) {
    if (mesesDevidos > 0) {
      dataExibicao = detalhe.dataPrimeiroVencimento;
      labelData = "Atrasado desde";
    } else if (status.label === 'Vence Hoje' || status.label === 'Vence Amanhã') {
      dataExibicao = detalhe.dataPrimeiroVencimento;
      labelData = "Vencimento";
    } else {
      // Se está em dia, mostramos o próximo vencimento real
      dataExibicao = detalhe.dataProximoVencimento;
      labelData = "Próximo";
    }
  }

  const dataFormatada = (data: Date) => {
    const d = data.getDate().toString().padStart(2, '0');
    const m = (data.getMonth() + 1).toString().padStart(2, '0');
    const y = data.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const dataTexto = dataFormatada(dataExibicao);

  const getWhatsAppMessage = () => {
    const primeiroNome = devedor.nomeCompleto.split(' ')[0];
    const saldo = formatarMoeda(devedor.saldoDevedorAtual);
    const juroMes = formatarMoeda(jurosMensalSimples);
    const acumulado = formatarMoeda(jurosAcumulados);

    if (devedor.saldoDevedorAtual === 0) {
      return `Olá ${primeiroNome}, parabéns! Seu saldo no Giro está quitado. Obrigado pela parceria!`;
    }

    if (status.label === 'Vence Hoje') {
      return `Olá ${primeiroNome}, lembrete do seu vencimento de HOJE (${dataTexto}). O valor para renovar seu saldo de ${saldo} é ${juroMes}. Como prefere pagar?`;
    }

    if (status.label === 'Vence Amanhã') {
      return `Olá ${primeiroNome}, passando para avisar que seu vencimento no Giro é AMANHÃ (${dataTexto}). O valor para renovar o saldo de ${saldo} é ${juroMes}. Já quer adiantar?`;
    }

    if (status.isAtrasado) {
      if (mesesDevidos > 1) {
        return `Olá ${primeiroNome}, identifiquei que seu vencimento do dia ${dataTexto} está em atraso e acumulou ${mesesDevidos} meses. O valor total para regularizar seu saldo de ${saldo} é ${acumulado}. Podemos combinar o acerto?`;
      }
      return `Olá ${primeiroNome}, seu vencimento do dia ${dataTexto} está em atraso. O valor para renovar seu saldo de ${saldo} é ${juroMes}. Como podemos resolver?`;
    }

    // Em Dia / Agendado
    return `Olá ${primeiroNome}, tudo bem? Seu saldo atual no Giro é ${saldo}. O valor da sua próxima renovação (${dataTexto}) será ${juroMes}.`;
  };

  const zapUrl = `https://wa.me/55${devedor.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(getWhatsAppMessage())}`;

  return (
    <div className="nu-card mb-3 p-4 flex flex-col gap-3 text-giro-text shadow-sm border border-gray-100/50 hover:shadow-md transition-shadow relative overflow-hidden">
        {/* Indicador de status lateral sutil */}
        <div className={cn("absolute top-0 right-0 w-1 h-full opacity-30", status.color.split(' ')[0])} />

        <div className="flex items-start justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-giro-primary/5 rounded-xl flex items-center justify-center text-giro-primary font-black text-base shrink-0 border border-giro-primary/10">
              {iniciais}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-black text-giro-text text-sm leading-tight truncate tracking-tight mb-1">{devedor.nomeCompleto}</h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={cn("text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest whitespace-nowrap shadow-sm ring-1 ring-inset ring-black/5", status.color)}>
                  {status.label}
                </span>
                <div className="flex items-center gap-1 text-[8px] font-bold text-giro-text-muted uppercase tracking-tight">
                  <CalendarClock className="w-2.5 h-2.5 text-giro-text-muted/40" /> 
                  <span className="opacity-60">{labelData}</span>
                  <span className="text-giro-text font-black">{dataTexto}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5 shrink-0 ml-1">
            <a 
              href={zapUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all active:scale-90"
              title="WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
            </a>
            
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)} 
                className={cn(
                  "p-1.5 rounded-lg transition-all active:scale-90",
                  showMenu ? "bg-gray-100 text-giro-primary" : "text-giro-text-muted hover:bg-gray-50"
                )}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[110]" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-2xl border border-gray-100 z-[120] py-1 overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-right">
                    <button
                      onClick={() => { onEditar(devedor); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold text-giro-text hover:bg-giro-primary/5 transition-colors uppercase tracking-wider"
                    >
                      <Pencil className="w-3 h-3 text-giro-primary/60" />
                      Editar Dados
                    </button>
                    <div className="h-[1px] bg-gray-50 mx-2" />
                    <button
                      onClick={() => { onExcluir(devedor); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 transition-colors uppercase tracking-wider"
                    >
                      <X className="w-3 h-3" />
                      Excluir Cliente
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      <div className="flex flex-col py-3 px-1 gap-3 border-y border-gray-100/50">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[7px] uppercase font-black text-giro-text-muted tracking-widest">Capital Emprestado</span>
              <span className="text-[7px] font-black text-blue-700 bg-blue-50/80 px-1 py-0.5 rounded ring-1 ring-inset ring-blue-100/50 uppercase">
                {devedor.taxaJurosMensal}%
              </span>
            </div>
            <span className={cn(
              "text-xl font-black tracking-tight leading-none",
              status.isAtrasado ? "text-red-600" : "text-giro-primary"
            )}>
              {formatarMoeda(devedor.saldoDevedorAtual)}
            </span>
          </div>

          <div className="flex flex-col items-end bg-gray-50/60 p-2 rounded-xl border border-gray-100 min-w-[70px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-[7px] uppercase font-black text-giro-text-muted mb-0.5 tracking-tight">Juro Mensal</span>
            <span className="text-[13px] font-black text-giro-text leading-none">
              {formatarMoeda(jurosMensalSimples)}
            </span>
          </div>
        </div>

        {mesesDevidos > 1 && (
          <div className="bg-red-50/50 border border-red-100 rounded-xl p-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-300 shadow-sm gap-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[7px] uppercase font-bold text-red-600 mb-0.5 tracking-tight opacity-80 truncate">Acumulado ({mesesDevidos}m)</span>
              <span className="text-sm font-black text-red-700 leading-none tracking-tight">
                {formatarMoeda(jurosAcumulados)}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-red-200/40 shrink-0" />
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[7px] uppercase font-bold text-red-600 mb-0.5 tracking-tight opacity-80 truncate">Total para Quitar</span>
              <span className="text-sm font-black text-red-700 leading-none tracking-tight">
                {formatarMoeda(devedor.saldoDevedorAtual + jurosAcumulados)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-1 py-1 bg-gray-50/40 rounded-lg">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-2.5 h-2.5 text-green-600/70" />
          <span className="text-[8px] font-bold uppercase tracking-wider text-giro-text-muted/60">Lucro Acumulado</span>
        </div>
        <span className="text-[10px] font-black text-green-700">{formatarMoeda(devedor.totalLucroGerado || 0)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={() => onPagar(devedor)}
          disabled={devedor.saldoDevedorAtual === 0}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-bold uppercase transition-colors",
            devedor.saldoDevedorAtual === 0 
              ? "bg-gray-50 text-gray-400 cursor-not-allowed opacity-50" 
              : "bg-green-50 text-green-700 hover:bg-green-100"
          )}
        >
          <ArrowDownCircle className="w-3.5 h-3.5" /> Receber
        </button>
        <button 
          onClick={() => onAporte(devedor)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-[9px] font-bold uppercase"
        >
          <ArrowUpCircle className="w-3.5 h-3.5" /> Aporte
        </button>
        <button 
          onClick={() => onVerHistorico(devedor)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-[9px] font-bold uppercase"
        >
          <History className="w-3.5 h-3.5" /> Logs
        </button>
      </div>
    </div>

  );
}
