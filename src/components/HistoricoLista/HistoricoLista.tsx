import React, { useState } from 'react';
import { Devedor, Emprestimo, Historico } from '../../types';
import { formatarMoeda, formatarData, cn } from '../../lib/utils';
import { 
  Download, 
  FileText, 
  Landmark, 
  CalendarClock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Pencil, 
  RefreshCw,
  Info
} from 'lucide-react';
import { gerarCSVHistorico } from '../../services/servicoExportacao';
import { useHistoricoLista } from './useHistoricoLista';
import { extrairData } from '../FormularioTransacao/FormularioTransacao.financeiro';
import { calcularDetalhamento } from '../../lib/financeiro/juros';
import { obterDadosFiscaisConsolidados, getInfoStatus, obterDataBaseReferencia } from '../../lib/financeiro/statusLogic';
import { ModalEditarHistorico } from './ModalEditarHistorico';
import { servicoDados } from '../../services/servicoDados';

interface HistoricoListaProps {
  devedor: Devedor;
  onAtualizacao?: () => void;
}

export function obterInfoContrato(h: Historico, devedor: Devedor) {
  if (h.descricaoContrato) {
    return {
      descricao: h.descricaoContrato,
      diaVencimento: h.diaVencimento,
    };
  }

  if (h.emprestimoId) {
    const emp = (devedor.emprestimos || []).find(e => e.id === h.emprestimoId);
    if (emp) {
      return {
        descricao: `Contrato #${emp.id?.slice(-4)} (Venc. Dia ${emp.diaVencimento})`,
        diaVencimento: emp.diaVencimento,
      };
    }
  }

  if (h.diaVencimento) {
    return {
      descricao: `Vencimento Todo Dia ${h.diaVencimento}`,
      diaVencimento: h.diaVencimento,
    };
  }

  if (h.observacao) {
    const matchDia = h.observacao.match(/Dia\s+(\d{1,2})/i);
    if (matchDia) {
      return {
        descricao: `Contrato Venc. Dia ${matchDia[1]}`,
        diaVencimento: parseInt(matchDia[1], 10),
      };
    }
  }

  const hDataObj = h.data?.toDate ? h.data.toDate() : new Date(h.data);
  const hDia = !isNaN(hDataObj.getTime()) ? hDataObj.getDate() : null;

  if (h.tipo === 'APORTE') {
    const hDataStr = !isNaN(hDataObj.getTime()) ? hDataObj.toISOString().slice(0, 10) : '';
    const empMatch = (devedor.emprestimos || []).find(e => {
      const empDataObj = e.dataInicio?.toDate ? e.dataInicio.toDate() : new Date(e.dataInicio);
      const empDataStr = !isNaN(empDataObj.getTime()) ? empDataObj.toISOString().slice(0, 10) : '';
      return Math.abs(e.valorBruto - h.valorTotal) < 0.01 && (empDataStr === hDataStr || !hDataStr);
    });
    if (empMatch) {
      return {
        descricao: `Contrato #${empMatch.id?.slice(-4)} (Venc. Dia ${empMatch.diaVencimento})`,
        diaVencimento: empMatch.diaVencimento,
      };
    }
  }

  // Para pagamentos antigos sem tag explícita, encontrar se coincidia com o dia de vencimento de algum contrato
  if (h.tipo === 'PAGAMENTO' && hDia !== null && devedor.emprestimos && devedor.emprestimos.length > 0) {
    // 1. Procurar contrato com o dia exato de vencimento
    const empPorDiaExato = devedor.emprestimos.find(e => e.diaVencimento === hDia);
    if (empPorDiaExato) {
      return {
        descricao: `Contrato #${empPorDiaExato.id?.slice(-4)} (Venc. Dia ${empPorDiaExato.diaVencimento})`,
        diaVencimento: empPorDiaExato.diaVencimento,
      };
    }

    // 2. Procurar contrato com dia de vencimento próximo (+/- 1 dia, ex: pago dia 17 para vencimento 18)
    const empPorDiaProximo = devedor.emprestimos.find(e => Math.abs(e.diaVencimento - hDia) <= 1);
    if (empPorDiaProximo) {
      return {
        descricao: `Contrato #${empPorDiaProximo.id?.slice(-4)} (Venc. Dia ${empPorDiaProximo.diaVencimento})`,
        diaVencimento: empPorDiaProximo.diaVencimento,
      };
    }
  }

  return null;
}

export function HistoricoLista({ devedor, onAtualizacao }: HistoricoListaProps) {
  const { historico, devedorAtual, carregando, recarregar } = useHistoricoLista({ devedor });
  const [tabAtiva, setTabAtiva] = useState<'historico' | 'contratos'>('historico');
  const [historicoParaEditar, setHistoricoParaEditar] = useState<Historico | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const emprestimos = devedorAtual.emprestimos || [];
  const ativos = emprestimos.filter(e => e.status === 'ATIVO');
  const quitados = emprestimos.filter(e => e.status === 'QUITADO');

  const handleSincronizarContratos = async () => {
    if (!devedor.id) return;
    setSincronizando(true);
    try {
      await servicoDados.sincronizarDevedorEContratos(devedor.id);
      await recarregar();
      onAtualizacao?.();
    } catch (err) {
      console.error('Erro ao sincronizar contratos:', err);
    } finally {
      setSincronizando(false);
    }
  };

  if (carregando) {
    return <div className="p-10 text-center text-giro-text-muted">Carregando histórico...</div>;
  }

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
          Histórico ({historico.length})
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
              onClick={() => gerarCSVHistorico(devedor.nomeCompleto, historico, devedor)}
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
                const infoContrato = obterInfoContrato(h, devedor);

                return (
                  <div key={h.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                          h.tipo === 'PAGAMENTO' ? "bg-green-50 text-green-700 border border-green-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                        )}>
                          {h.tipo === 'PAGAMENTO' ? 'Recebimento' : 'Aporte'}
                        </span>
                        <span className="text-[10px] font-bold text-giro-text-muted">{formatarData(dataObj)}</span>
                        
                        {/* Identificador do Contrato & Vencimento */}
                        {infoContrato && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-150">
                            <CalendarClock className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                            {infoContrato.descricao}
                          </span>
                        )}
                      </div>
                      
                      <span className={cn(
                        "font-black text-sm shrink-0 ml-2",
                        h.tipo === 'PAGAMENTO' ? "text-green-600" : "text-blue-600"
                      )}>
                        {h.tipo === 'PAGAMENTO' ? '-' : '+'}{formatarMoeda(h.valorTotal)}
                      </span>
                    </div>

                    {h.tipo === 'PAGAMENTO' && (
                      <div className="text-[10px] text-giro-text-muted font-semibold mb-1 flex flex-wrap gap-x-2">
                        <span>Juros: <strong className="text-orange-700 font-bold">{formatarMoeda(h.valorJuros)}</strong></span>
                        <span>•</span>
                        <span>Amortização: <strong className="text-green-700 font-bold">{formatarMoeda(h.valorAmortizado)}</strong></span>
                      </div>
                    )}

                    {/* Detalhamento multicontratos se disponível */}
                    {h.detalheContratos && h.detalheContratos.length > 1 && (
                      <div className="my-1.5 p-2 bg-gray-50/80 rounded-xl border border-gray-100 text-[9px] flex flex-col gap-1">
                        <span className="font-bold text-giro-text-muted uppercase text-[8px] tracking-wider">Distribuição por Contrato:</span>
                        {h.detalheContratos.map((det, idx) => (
                          <div key={det.emprestimoId || idx} className="flex justify-between items-center text-giro-text">
                            <span className="font-semibold text-purple-900">
                              Contrato Venc. Dia {det.diaVencimento || '?'}:
                            </span>
                            <span className="font-mono text-[9px]">
                              Juros: {formatarMoeda(det.jurosPagos)} | Amort.: {formatarMoeda(det.amortizado)} | Restante: {formatarMoeda(det.saldoRestante)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-xs font-medium text-giro-text-muted">{h.observacao || 'Sem observação'}</div>
                    
                    {(h.criadoPorNome || h.criadoPorEmail) && (
                      <div className="text-[9px] text-giro-primary font-bold mt-1">
                        Operado por: {h.criadoPorNome || h.criadoPorEmail}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1 pt-1 border-t border-dashed border-gray-100">
                      <button
                        onClick={() => setHistoricoParaEditar(h)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-giro-primary hover:text-purple-800 hover:bg-purple-50 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        title="Editar data, contrato ou observação deste lançamento"
                      >
                        <Pencil className="w-3 h-3" />
                        Editar Lançamento
                      </button>
                      <span className="font-mono font-bold">
                        Saldo restante: {formatarMoeda(h.saldoRestante)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ABA DE CONTRATOS */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-giro-text-muted">Total de {emprestimos.length} contratos</span>
            <button
              onClick={handleSincronizarContratos}
              disabled={sincronizando}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-all border border-purple-200 cursor-pointer disabled:opacity-50"
              title="Recalcula e sincroniza as datas de pagamento e vencimento de todos os contratos com base no histórico"
            >
              <RefreshCw className={cn("w-3 h-3", sincronizando && "animate-spin")} />
              {sincronizando ? 'Sincronizando...' : 'Sincronizar Contratos'}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {emprestimos.length === 0 ? (
              <div className="text-center py-6 text-giro-text-muted text-xs">Este devedor não possui empréstimos registrados.</div>
            ) : (
              [...ativos, ...quitados].map((e, idx) => {
                const dataInicioFormatada = e.dataInicio
                  ? (e.dataInicio.toDate ? e.dataInicio.toDate() : new Date(e.dataInicio)).toLocaleDateString('pt-BR')
                  : '';

                const dataUltimoPagamentoFormatada = e.ultimoPagamento
                  ? (e.ultimoPagamento.toDate ? e.ultimoPagamento.toDate() : new Date(e.ultimoPagamento)).toLocaleDateString('pt-BR')
                  : null;
                
                // Progresso de quitação do contrato
                const percentualPago = e.valorBruto > 0 
                  ? Math.round(((e.valorBruto - e.saldoDevedor) / e.valorBruto) * 100)
                  : 100;

                const ehAtivo = e.status === 'ATIVO';

                // Cálculo das métricas fiscais e próximo vencimento para este contrato específico
                const diaVenc = e.diaVencimento || 1;
                const ref = obterDataBaseReferencia(e);
                const det = calcularDetalhamento(diaVenc, ref, e.saldoDevedor, e.taxaJurosMensal);
                const proximoVencimento = det.dataProximoVencimento;

                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const diffDias = Math.ceil((proximoVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

                let statusContratoLabel = 'Em Dia';
                let statusContratoColor = 'bg-blue-50 text-blue-700 border-blue-100';

                if (!ehAtivo) {
                  statusContratoLabel = 'Quitado';
                  statusContratoColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                } else if (det.mesesDevidos > 0) {
                  statusContratoLabel = det.mesesDevidos > 1 ? `Atraso (${det.mesesDevidos}x)` : 'Em Atraso';
                  statusContratoColor = 'bg-red-50 text-red-700 border-red-100';
                } else if (diffDias === 0) {
                  statusContratoLabel = 'Vence Hoje';
                  statusContratoColor = 'bg-amber-50 text-amber-700 border-amber-100';
                } else if (diffDias === 1) {
                  statusContratoLabel = 'Vence Amanhã';
                  statusContratoColor = 'bg-sky-50 text-sky-700 border-sky-100';
                }

                return (
                  <div 
                    key={e.id || idx} 
                    className={cn(
                      "p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-shadow",
                      ehAtivo 
                        ? "bg-white border-gray-150 shadow-[0_2px_8px_rgba(0,0,0,0.03)]" 
                        : "bg-gray-50/50 border-gray-100 opacity-70"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black tracking-tight text-giro-text">Contrato #{e.id?.slice(-4) || (idx + 1)}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border",
                            statusContratoColor
                          )}>
                            {statusContratoLabel}
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

                    {/* Grid com datas de vencimento e valores */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100/70 text-[9px] text-giro-text-muted font-semibold">
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase font-black tracking-wider text-giro-text-muted/60">Valor Original</span>
                        <span className="font-bold text-giro-text">{formatarMoeda(e.valorBruto)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase font-black tracking-wider text-giro-text-muted/60">Juros Mensal</span>
                        <span className="font-bold text-giro-text">{e.taxaJurosMensal}% ao mês</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase font-black tracking-wider text-giro-text-muted/60">Dia Vencimento</span>
                        <span className="font-bold text-purple-700">Todo dia {e.diaVencimento}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] uppercase font-black tracking-wider text-giro-text-muted/60">Próximo Vencimento</span>
                        <span className={cn(
                          "font-bold",
                          ehAtivo ? (det.mesesDevidos > 0 ? "text-red-600 font-black" : "text-giro-text") : "text-gray-400"
                        )}>
                          {ehAtivo ? formatarData(proximoVencimento) : 'Quitado'}
                        </span>
                      </div>
                    </div>

                    {/* Informações adicionais de juros e último pagamento */}
                    {ehAtivo && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-gray-100 text-[8px] font-bold text-giro-text-muted">
                        <span>Juros Estimados Acumulados: <strong className="text-orange-700">{formatarMoeda(det.jurosAcumulados)}</strong></span>
                        {dataUltimoPagamentoFormatada && (
                          <span>Último Pagto: <strong className="text-giro-text">{dataUltimoPagamentoFormatada}</strong></span>
                        )}
                      </div>
                    )}

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

      {/* Modal de Edição de Lançamento */}
      {historicoParaEditar && (
        <ModalEditarHistorico
          devedor={devedor}
          historico={historicoParaEditar}
          onClose={() => setHistoricoParaEditar(null)}
          onSuccess={() => {
            setHistoricoParaEditar(null);
            recarregar();
            onAtualizacao?.();
          }}
        />
      )}
    </div>
  );
}

