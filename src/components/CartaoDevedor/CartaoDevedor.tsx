/**
 * Componente Visual CartaoDevedor.
 * Renderiza o cartão individual de cada devedor de acordo com seu status, saldo e carteira.
 * Todas as nomenclaturas e termos estão rigorosamente em português e os nomes de arquivos também.
 */

import React from 'react';
import { Devedor } from '../../types';
import { useCartaoDevedor } from './useCartaoDevedor';
import { formatarMoeda, cn } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import {
  MessageCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  CalendarClock,
  Pencil,
  X,
  MoreVertical,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface CartaoDevedorProps {
  devedor: Devedor;
  carteiraNome?: string;
  podeExcluir?: boolean;
  onPagar: (d: Devedor) => void;
  onAporte: (d: Devedor) => void;
  onVerHistorico: (d: Devedor) => void;
  onEditar: (d: Devedor) => void;
  onExcluir: (d: Devedor) => void;
}

export const CartaoDevedor: React.FC<CartaoDevedorProps> = ({
  devedor,
  carteiraNome,
  podeExcluir = true,
  onPagar,
  onAporte,
  onVerHistorico,
  onEditar,
  onExcluir,
}) => {
  const {
    menuAberto,
    setMenuAberto,
    iniciaisNome,
    mesesDevidos,
    jurosAcumulados,
    jurosMensalSimples,
    statusInfo,
    tipoLabelData,
    dataTextoFormatada,
    urlWhatsApp,
    saldoDevedorAtual,
  } = useCartaoDevedor({ devedor });

  const ehDonoDoCard = !devedor.ownerId || devedor.ownerId === auth.currentUser?.uid;

  return (
    <div className="nu-card mb-3 p-4 flex flex-col gap-3 text-giro-text shadow-sm border border-gray-100/50 hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Indicador de status lateral sutil */}
      <div className={cn("absolute top-0 right-0 w-1 h-full opacity-30", statusInfo.color.split(' ')[0])} />

      <div className="flex items-start justify-between min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-giro-primary/5 rounded-xl flex items-center justify-center text-giro-primary font-black text-base shrink-0 border border-giro-primary/10">
            {iniciaisNome}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-black text-giro-text text-sm leading-tight truncate tracking-tight mb-1">
              {devedor.nomeCompleto}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn("text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest whitespace-nowrap shadow-sm ring-1 ring-inset ring-black/5", statusInfo.color)}>
                {statusInfo.label}
              </span>
              {carteiraNome && (
                <span className="inline-flex items-center gap-1 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest whitespace-nowrap bg-blue-50 text-blue-800 border border-blue-100 shadow-sm font-bold">
                  <Wallet className="w-2 h-2 text-blue-500" />
                  {carteiraNome}
                </span>
              )}
              <div className="flex items-center gap-1 text-[8px] font-bold text-giro-text-muted uppercase tracking-tight">
                <CalendarClock className="w-2.5 h-2.5 text-giro-text-muted/40" /> 
                <span className="opacity-60">{tipoLabelData}</span>
                <span className="text-giro-text font-black">{dataTextoFormatada}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          <a 
            href={urlWhatsApp} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all active:scale-90"
            title="WhatsApp"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
          </a>
          
          <div className="relative">
            <button 
              onClick={() => setMenuAberto(!menuAberto)} 
              className={cn(
                "p-1.5 rounded-lg transition-all active:scale-90",
                menuAberto ? "bg-gray-100 text-giro-primary" : "text-giro-text-muted hover:bg-gray-50"
              )}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuAberto && (
              <>
                <div 
                  className="fixed inset-0 z-[110]" 
                  onClick={() => setMenuAberto(false)}
                />
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-2xl border border-gray-100 z-[120] py-1 overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-right">
                  <button
                    onClick={() => { onEditar(devedor); setMenuAberto(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold text-giro-text hover:bg-giro-primary/5 transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    <Pencil className="w-3 h-3 text-giro-primary/60" />
                    Editar Dados
                  </button>
                  {podeExcluir && (
                    <>
                      <div className="h-[1px] bg-gray-50 mx-2" />
                      <button
                        onClick={() => { onExcluir(devedor); setMenuAberto(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        Excluir Cliente
                      </button>
                    </>
                  )}
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
            </div>
            <span className={cn(
              "text-xl font-black tracking-tight leading-none",
              statusInfo.isAtrasado ? "text-red-600" : "text-giro-primary"
            )}>
              {formatarMoeda(saldoDevedorAtual)}
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
                {formatarMoeda(saldoDevedorAtual + jurosAcumulados)}
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
          disabled={saldoDevedorAtual === 0}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-bold uppercase transition-colors pointer-events-auto cursor-pointer",
            saldoDevedorAtual === 0 
              ? "bg-gray-50 text-gray-400 cursor-not-allowed opacity-50 pointer-events-none" 
              : "bg-green-50 text-green-700 hover:bg-green-100"
          )}
        >
          <ArrowDownCircle className="w-3.5 h-3.5" /> Receber
        </button>
        <button 
          onClick={() => onAporte(devedor)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-[9px] font-bold uppercase cursor-pointer"
        >
          <ArrowUpCircle className="w-3.5 h-3.5" /> Emprestar
        </button>
        <button 
          onClick={() => onVerHistorico(devedor)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-[9px] font-bold uppercase cursor-pointer"
        >
          <History className="w-3.5 h-3.5" /> Logs
        </button>
      </div>
    </div>
  );
};
