import React from 'react';
import { Devedor } from '../types';
import { formatarMoeda, cn } from '../lib/utils';
import { MessageCircle, ArrowUpCircle, ArrowDownCircle, History, CalendarClock, Pencil, X, MoreVertical } from 'lucide-react';
import { calcularJurosDoPeriodo, calcularMesesDevidos, calcularJurosAcumulados } from '../lib/financeiro/juros';
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
    : (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate() : new Date());
  
  const mesesDevidos = devedor.saldoDevedorAtual > 0 ? calcularMesesDevidos(diaVencimento, dataReferencia) : 1;
  const jurosAcumulados = calcularJurosAcumulados(devedor.saldoDevedorAtual, devedor.taxaJurosMensal, mesesDevidos);
  const jurosMensalSimples = calcularJurosDoPeriodo(devedor.saldoDevedorAtual, devedor.taxaJurosMensal);

  const status = getInfoStatus(devedor);
  const proximoVenc = getProximoVencimento(devedor);
  
  // Se está atrasado, queremos mostrar a data que VENCEU (passada)
  let dataExibicao = proximoVenc;
  if (status.isAtrasado) {
    const hoje = new Date();
    const diaVenc = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date(devedor.dataCriacao).getDate());
    
    // Se hoje é dia 1-5 e o vencimento é 20-31, o vencimento foi no mês anterior
    if (hoje.getDate() <= 5 && diaVenc > 20) {
      dataExibicao = new Date(hoje.getFullYear(), hoje.getMonth() - 1, diaVenc);
    } else {
      dataExibicao = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
    }
  }

  const dataTexto = `${dataExibicao.getDate()}/${dataExibicao.getMonth() + 1}`;

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
    <div className="nu-card mb-3 p-4 flex flex-col gap-3 text-giro-text">
        <div className="flex items-start justify-between relative">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-giro-primary/10 rounded-full flex items-center justify-center text-giro-primary font-bold text-sm shrink-0 shadow-sm border border-giro-primary/5">
              {iniciais}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-black text-giro-text text-base leading-tight truncate tracking-tight">{devedor.nomeCompleto}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap shrink-0", status.color)}>
                  {status.label}
                </span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-giro-text-muted uppercase whitespace-nowrap">
                  <CalendarClock className="w-2.5 h-2.5" /> {dataTexto}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-0 shrink-0">
            <a 
              href={zapUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-all active:scale-90"
              title="WhatsApp"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
            </a>
            
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)} 
                className={cn(
                  "p-2 rounded-full transition-all active:scale-90",
                  showMenu ? "bg-gray-100 text-giro-primary" : "text-giro-text-muted hover:bg-gray-50"
                )}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[110]" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[120] py-1.5 overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-right">
                    <button
                      onClick={() => { onEditar(devedor); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-giro-text hover:bg-giro-primary/5 transition-colors uppercase tracking-wider"
                    >
                      <Pencil className="w-3.5 h-3.5 text-giro-primary/60" />
                      Editar Dados
                    </button>
                    <div className="h-[1px] bg-gray-50 mx-2" />
                    <button
                      onClick={() => { onExcluir(devedor); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-red-600 hover:bg-red-50 transition-colors uppercase tracking-wider"
                    >
                      <X className="w-3.5 h-3.5" />
                      Excluir Cliente
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      <div className="flex items-end py-3 border-y border-gray-50/80">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[8px] uppercase font-bold text-giro-text-muted">Saldo Devedor</span>
            <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 px-1 rounded uppercase">
              {devedor.taxaJurosMensal}%
            </span>
          </div>
          <span className={cn(
            "text-xl font-black tracking-tighter leading-none truncate",
            status.isAtrasado ? "text-red-600" : "text-giro-primary"
          )}>
            {formatarMoeda(devedor.saldoDevedorAtual)}
          </span>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="flex flex-col border-l border-gray-100 pl-3">
            <span className="text-[8px] uppercase font-bold text-giro-text-muted mb-0.5">Juro Mês</span>
            <span className="text-[11px] font-bold tracking-tight text-giro-text">
              {formatarMoeda(jurosMensalSimples)}
            </span>
          </div>
          {mesesDevidos > 1 && (
            <div className="flex flex-col border-l border-gray-100 pl-3">
              <span className="text-[8px] uppercase font-bold text-red-500 mb-0.5">Acumulado</span>
              <span className="text-[11px] font-bold tracking-tight text-red-700">
                {formatarMoeda(jurosAcumulados)}
              </span>
            </div>
          )}
          <div className="flex flex-col border-l border-gray-100 pl-3">
            <span className="text-[8px] uppercase font-bold text-green-600 mb-0.5">Lucro Total</span>
            <span className="text-[11px] font-bold tracking-tight text-green-700">{formatarMoeda(devedor.totalLucroGerado || 0)}</span>
          </div>
        </div>
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
