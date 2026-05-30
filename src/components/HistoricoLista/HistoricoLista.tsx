import React, { useState } from 'react';
import { Devedor, Emprestimo } from '../../types';
import { formatarMoeda, formatarData, cn } from '../../lib/utils';
import { Download, FileText, Landmark, ShieldCheck } from 'lucide-react';
import { gerarCSVHistorico } from '../../services/servicoExportacao';
import { useHistoricoLista } from './useHistoricoLista';

interface HistoricoListaProps {
  devedor: Devedor;
}

export function HistoricoLista({ devedor }: HistoricoListaProps) {
  const { historico, carregando } = useHistoricoLista({ devedor });
  const [tabAtiva, setTabAtiva] = useState<'historico' | 'contratos'>('historico');

  if (carregando) {
    return <div className="p-10 text-center text-giro-text-muted">Carregando histórico...</div>;
  }

  const emprestimos = devedor.emprestimos || [];
  const ativos = emprestimos.filter(e => e.status === 'ATIVO');
  const quitados = emprestimos.filter(e => e.status === 'QUITADO');

  return (
    <div className="flex flex-col gap-4 text-giro-text">
      {/* Botões de Navegação das Abas estilo Nu */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-2">
        <button
          onClick={() => setTabAtiva('historico')}
          className={cn(
            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            tabAtiva === 'historico'
              ? "bg-white text-giro-primary shadow-sm"
              : "text-giro-text-muted hover:text-giro-text"
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          Histórico
        </button>
        <button
          onClick={() => setTabAtiva('contratos')}
          className={cn(
            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            tabAtiva === 'contratos'
              ? "bg-white text-giro-primary shadow-sm"
              : "text-giro-text-muted hover:text-giro-text"
          )}
        >
          <Landmark className="w-3.5 h-3.5" />
          Contratos ({ativos.length})
        </button>
      </div>

      {tabAtiva === 'historico' ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-giro-text-muted">{historico.length} lançamentos</span>
            <button 
              onClick={() => gerarCSVHistorico(devedor.nomeCompleto, historico)}
              className="flex items-center gap-1 text-xs text-giro-primary font-bold hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {historico.length === 0 ? (
              <div className="text-center py-6 text-giro-text-muted text-xs">Nenhum registro encontrado.</div>
            ) : (
              historico.map(h => {
                 const dataObj = h.data?.toDate ? h.data.toDate() : new Date(h.data);
                 return (
                  <div key={h.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-full mr-2",
                          h.tipo === 'PAGAMENTO' ? "bg-green-50 text-green-700 border border-green-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                        )}>
                          {h.tipo === 'PAGAMENTO' ? 'Recebimento' : 'Aporte'}
                        </span>
                        <span className="text-[10px] font-bold text-giro-text-muted">{formatarData(dataObj)}</span>
                      </div>
                      <span className={cn(
                        "font-black text-sm",
                        h.tipo === 'PAGAMENTO' ? "text-green-600" : "text-blue-600"
                      )}>
                        {h.tipo === 'PAGAMENTO' ? '-' : '+'}{formatarMoeda(h.valorTotal)}
                      </span>
                    </div>
                    {h.tipo === 'PAGAMENTO' && (
                      <div className="text-[10px] text-giro-text-muted font-semibold mb-1">
                        Juros: {formatarMoeda(h.valorJuros)} | Amortização: {formatarMoeda(h.valorAmortizado)}
                      </div>
                    )}
                    <div className="text-xs font-medium text-giro-text-muted">{h.observacao || 'Sem observação'}</div>
                    {(h.criadoPorNome || h.criadoPorEmail) && (
                      <div className="text-[9px] text-giro-primary font-bold mt-1">
                        Operado por: {h.criadoPorNome || h.criadoPorEmail}
                      </div>
                    )}
                    <div className="text-[10px] text-right font-mono font-bold text-gray-400 mt-0.5">
                      Saldo: {formatarMoeda(h.saldoRestante)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <span className="text-xs font-bold text-giro-text-muted">Total de {emprestimos.length} contratos</span>

          <div className="flex flex-col gap-3">
            {emprestimos.length === 0 ? (
              <div className="text-center py-6 text-giro-text-muted text-xs">Este devedor não possui empréstimos registrados.</div>
            ) : (
              [...ativos, ...quitados].map((e, idx) => {
                const dataInicioFormatada = e.dataInicio
                  ? (e.dataInicio.toDate ? e.dataInicio.toDate() : new Date(e.dataInicio)).toLocaleDateString('pt-BR')
                  : '';
                
                // Progresso de quitação do contrato
                const percentualPago = e.valorBruto > 0 
                  ? Math.round(((e.valorBruto - e.saldoDevedor) / e.valorBruto) * 100)
                  : 100;

                const ehAtivo = e.status === 'ATIVO';

                return (
                  <div 
                    key={e.id || idx} 
                    className={cn(
                      "p-3 rounded-2xl border flex flex-col gap-2.5 transition-shadow",
                      ehAtivo 
                        ? "bg-white border-gray-150 shadow-[0_2px_8px_rgba(0,0,0,0.03)]" 
                        : "bg-gray-50/50 border-gray-100 opacity-70"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black tracking-tight text-giro-text">Contrato #{e.id?.slice(-4) || (idx + 1)}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border",
                            ehAtivo 
                              ? "bg-blue-50 text-blue-700 border-blue-100" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          )}>
                            {ehAtivo ? 'Ativo' : 'Quitado'}
                          </span>
                        </div>
                        <span className="text-[9px] text-giro-text-muted font-bold mt-0.5">Liberado em {dataInicioFormatada}</span>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] uppercase tracking-wider font-black text-giro-text-muted">Saldo Devedor</span>
                        <span className={cn(
                          "font-black text-sm",
                          ehAtivo ? "text-giro-primary" : "text-emerald-700"
                        )}>
                          {formatarMoeda(e.saldoDevedor)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="w-full">
                      <div className="flex justify-between items-center text-[8px] font-bold text-giro-text-muted mb-1">
                        <span>Progresso de Repagamento</span>
                        <span>{percentualPago}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            ehAtivo ? "bg-giro-primary" : "bg-emerald-600"
                          )} 
                          style={{ width: `${percentualPago}%` }} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100/60 text-[9px] text-giro-text-muted font-semibold">
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase font-black tracking-wider text-giro-text-muted/60">Valor Original</span>
                        <span className="font-bold text-giro-text">{formatarMoeda(e.valorBruto)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase font-black tracking-wider text-giro-text-muted/60">Juros Mensal</span>
                        <span className="font-bold text-giro-text">{e.taxaJurosMensal}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase font-black tracking-wider text-giro-text-muted/60">Vencimento</span>
                        <span className="font-bold text-giro-text">Dia {e.diaVencimento}</span>
                      </div>
                    </div>

                    {e.observacao && (
                      <p className="text-[9px] italic text-giro-text-muted/70 bg-gray-50 p-1.5 rounded-lg border border-gray-100/50">
                        "{e.observacao}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
