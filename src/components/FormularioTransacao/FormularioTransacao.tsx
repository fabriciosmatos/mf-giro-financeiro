/**
 * Componente Visual FormularioTransacao.
 * Implementa apenas o design do formulário de transações.
 * Rigorosamente em português.
 */

import React, { useState } from 'react';
import { Devedor, TipoTransacao } from '../../types';
import { useFormularioTransacao } from './useFormularioTransacao';
import { formatarMoeda, aplicarMascaraDinheiro, obterValorNumericoDeMascara, formatarData } from '../../lib/utils';
import { BotaoConfirmarDuploClique } from '../BotaoConfirmarDuploClique';
import { extrairData } from './FormularioTransacao.financeiro';
import { calcularDetalhamento } from '../../lib/financeiro/juros';

interface FormularioTransacaoProps {
  devedor: Devedor;
  tipo: TipoTransacao;
  onSuccess: () => void;
}

export function FormularioTransacao({ devedor, tipo, onSuccess }: FormularioTransacaoProps) {
  const {
    dataTransacao,
    setDataTransacao,
    valor,
    setValor,
    taxaJurosMensal,
    setTaxaJurosMensal,
    diaVencimento,
    setDiaVencimento,
    observacao,
    setObservacao,
    carregando,
    juros,
    amortizacao,
    lidarComEnvio,
    jurosEstimado,
    detalheAlocacao,
    emprestimoIdSelecionado,
    setEmprestimoIdSelecionado,
    ativosDevedor,
    tipoAmortizacao,
    setTipoAmortizacao,
  } = useFormularioTransacao({ devedor, tipo, onSuccess });

  const [mostrarExplicacao, setMostrarExplicacao] = useState(false);

  const ehPagamento = tipo === 'PAGAMENTO';

  const empSelecionado = devedor.emprestimos?.find(e => e.id === emprestimoIdSelecionado);
  let infoBreakdown: any = null;

  if (ehPagamento && empSelecionado) {
    const diaVenc = empSelecionado.diaVencimento || 1;
    const refDateObj = extrairData(empSelecionado.ultimoPagamento || empSelecionado.dataInicio);
    const dataRefObj = dataTransacao ? new Date(dataTransacao + 'T12:00:00') : new Date();

    const det = calcularDetalhamento(
      diaVenc,
      refDateObj,
      empSelecionado.saldoDevedor,
      empSelecionado.taxaJurosMensal,
      dataRefObj
    );

    infoBreakdown = {
      saldoDevedor: empSelecionado.saldoDevedor,
      taxaJurosMensal: empSelecionado.taxaJurosMensal,
      diaVencimento: diaVenc,
      inicioReferencia: refDateObj,
      fimReferencia: dataRefObj,
      mesesDevidos: det.mesesDevidos,
      jurosCalculados: det.jurosAcumulados,
      proximoVencimento: det.dataPrimeiroVencimento,
    };
  }

  return (
    <form onSubmit={lidarComEnvio} className="flex flex-col gap-6 text-giro-text">
      
      {/* Resumo ou data da operação */}
      <div className="grid grid-cols-2 gap-4">
        {ehPagamento ? (
          <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-100/60 border-l-4 border-l-orange-500 col-span-2 lg:col-span-1 flex flex-col justify-between min-h-[82px] shadow-sm">
            <div>
              <span className="text-[10px] text-orange-700 font-extrabold uppercase tracking-wider mb-0.5 block">Juros Estimados Acumulados</span>
              <span className="text-xl font-black text-orange-600">{formatarMoeda(jurosEstimado)}</span>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[9px] text-orange-600/70 font-semibold">✨ Cálculo automático para a data selecionada</span>
              {empSelecionado && (
                <button
                  type="button"
                  onClick={() => setMostrarExplicacao(!mostrarExplicacao)}
                  className="text-[9px] text-orange-600 hover:text-orange-700 underline font-extrabold text-left cursor-pointer transition-colors block"
                >
                  {mostrarExplicacao ? '🙈 Ocultar explicação do cálculo' : '🔍 Veja como está funcionando esse campo'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/60 border-l-4 border-l-blue-500 col-span-2 lg:col-span-1 flex flex-col justify-between min-h-[82px] shadow-sm">
            <div>
              <span className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider mb-0.5 block">Capital Atual na Rua</span>
              <span className="text-xl font-black text-blue-600">{formatarMoeda(devedor.saldoDevedorAtual || 0)}</span>
            </div>
            <span className="text-[9px] text-blue-600/70 font-semibold mt-1">ℹ️ Saldo consolidado deste cliente</span>
          </div>
        )}
        
        <div className="p-4 bg-giro-bg rounded-2xl border border-gray-100 col-span-2 lg:col-span-1 flex flex-col justify-between min-h-[82px] shadow-sm">
          <div>
            <label className="text-[10px] text-giro-text-muted uppercase font-extrabold tracking-wider mb-0.5 block">
              {ehPagamento ? 'Data do Recebimento' : 'Data de Liberação'}
            </label>
            <input 
              type="date"
              value={dataTransacao}
              onChange={e => setDataTransacao(e.target.value)}
              className="bg-transparent font-black w-full outline-none text-giro-text text-base cursor-pointer"
            />
          </div>
          <span className="text-[9px] text-giro-text-muted font-semibold mt-1">📅 Clique para alterar a data</span>
        </div>

        {ehPagamento && mostrarExplicacao && infoBreakdown && (
          <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 col-span-2 text-xs text-orange-900 flex flex-col gap-2.5 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-orange-100 pb-1.5">
              <h4 className="font-bold text-orange-850 uppercase tracking-wider text-[10px]">📊 Detalhamento do Cálculo de Juros</h4>
              <span className="text-[9px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded-full">Contrato #{empSelecionado?.id?.slice(-4)}</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <div className="flex justify-between border-b border-orange-100/40 pb-1">
                <span className="text-orange-700 font-medium">Dívida Principal:</span>
                <span className="font-bold">{formatarMoeda(infoBreakdown.saldoDevedor)}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100/40 pb-1">
                <span className="text-orange-700 font-medium">Taxa de Juros:</span>
                <span className="font-bold">{infoBreakdown.taxaJurosMensal}% ao mês</span>
              </div>
              <div className="flex justify-between border-b border-orange-100/40 pb-1">
                <span className="text-orange-700 font-medium">Início Período:</span>
                <span className="font-bold">{formatarData(infoBreakdown.inicioReferencia)}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100/40 pb-1">
                <span className="text-orange-700 font-medium">Fim (Calculado até):</span>
                <span className="font-bold">{formatarData(infoBreakdown.fimReferencia)}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100/40 pb-1">
                <span className="text-orange-700 font-medium">Dia de Vencimento:</span>
                <span className="font-bold">Todo dia {infoBreakdown.diaVencimento}</span>
              </div>
              <div className="flex justify-between border-b border-orange-100/40 pb-1">
                <span className="text-orange-700 font-medium">Próximo Vencimento:</span>
                <span className="font-bold">{formatarData(infoBreakdown.proximoVencimento)}</span>
              </div>
            </div>
            <div className="mt-1 bg-white/60 p-2.5 rounded-xl border border-orange-100/50 text-[11px] leading-relaxed">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">🗓️</span>
                <span className="font-bold text-orange-900">Períodos Completos Devidos: {infoBreakdown.mesesDevidos} {infoBreakdown.mesesDevidos === 1 ? 'mês' : 'meses'}</span>
              </div>
              {infoBreakdown.mesesDevidos === 0 ? (
                <p className="text-orange-800 font-medium">
                  A data de recebimento selecionada ({formatarData(infoBreakdown.fimReferencia)}) é anterior ao próximo vencimento oficial ({formatarData(infoBreakdown.proximoVencimento)}). No modo <strong>Automático</strong>, os juros mensais só são cobrados após o vencimento do ciclo.
                  <br />
                  <span className="block mt-1.5 text-orange-950 font-bold">💡 Dica comercial: Se você quer cobrar 1 período completo de juros retroativos/correntes agora mesmo sem ter completado o mês cheio, mude a opção de Distribuição abaixo para: <strong>&ldquo;Cobrar Juros do Mês Corrente (Garante 1 mês)&rdquo;</strong>.</span>
                </p>
              ) : (
                <p className="text-orange-850 font-semibold font-mono">
                  Cálculo: {formatarMoeda(infoBreakdown.saldoDevedor)} × {infoBreakdown.taxaJurosMensal}%/mês × {infoBreakdown.mesesDevidos} {infoBreakdown.mesesDevidos === 1 ? 'mês' : 'meses'} = {formatarMoeda(infoBreakdown.jurosCalculados)} de juros estimados acumulados.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inputs com condições específicas de Aporte/Novo Empréstimo vs Recebimento */}
      <div className="flex flex-col gap-4">
        {ehPagamento && (
          <div>
            <label className="block text-xs font-black uppercase text-giro-text-muted mb-2 tracking-wider">
              Contrato para Abater
            </label>
            {ativosDevedor.length === 0 ? (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl">
                ⚠️ Este cliente não possui nenhum contrato/empréstimo ativo para abater.
              </div>
            ) : (
              <select
                value={emprestimoIdSelecionado}
                onChange={e => setEmprestimoIdSelecionado(e.target.value)}
                className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary text-sm font-bold text-giro-text cursor-pointer"
                required
              >
                <option value="" disabled>Selecione o contrato ativo...</option>
                {ativosDevedor.map((emp, idx) => (
                  <option key={emp.id} value={emp.id}>
                    Contrato #{emp.id?.slice(-4) || (idx + 1)} (Saldo: {formatarMoeda(emp.saldoDevedor)} | Juros: {emp.taxaJurosMensal}%)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {ehPagamento && ativosDevedor.length > 0 && (
          <div>
            <label className="block text-xs font-black uppercase text-giro-text-muted mb-2 tracking-wider">
              Modo de Distribuição (Destino do Valor)
            </label>
            <select
              value={tipoAmortizacao}
              onChange={e => setTipoAmortizacao(e.target.value as any)}
              className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary text-sm font-bold text-giro-text cursor-pointer"
            >
              <option value="automatico">🔄 Automático (Abater juros vencidos primeiro, restante amortiza)</option>
              <option value="juros-mensal">📅 Cobrar Juros do Mês Corrente (Garante 1 mês de juros, restante amortiza)</option>
              <option value="apenas-juros">💰 Apenas Juros / Lucro (Todo o valor vira juro pago, sem reduzir o principal)</option>
              <option value="apenas-amortizacao">📉 Apenas Amortização (Todo o valor reduz o principal, sem cobrar juros)</option>
            </select>
            <p className="mt-1.5 px-1 text-[10px] text-giro-text-muted leading-relaxed font-medium">
              {tipoAmortizacao === 'automatico' && "* Ideal para receber faturas já fechadas ou parcelas que já passaram do dia do vencimento."}
              {tipoAmortizacao === 'juros-mensal' && "* Ideal quando o recebimento é feito antes do dia de vencimento, computando os juros fixos de 1 período completo."}
              {tipoAmortizacao === 'apenas-juros' && "* Use para retirar lucros ou taxa de juros pura, mantendo o montante total que ele deve intacto."}
              {tipoAmortizacao === 'apenas-amortizacao' && "* Use para devolução direta de capital (dedução do principal da dívida sem incidência de juros neste ato)."}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-black uppercase text-giro-text-muted mb-2 tracking-wider">
            {ehPagamento ? 'Valor do Recebimento (R$)' : 'Valor do Novo Empréstimo (R$)'}
          </label>
          <input 
            type="text" 
            inputMode="numeric"
            value={valor}
            onChange={e => setValor(aplicarMascaraDinheiro(e.target.value))}
            placeholder="0,00"
            className="w-full text-2xl font-bold p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
            required
            disabled={ehPagamento && ativosDevedor.length === 0}
          />
        </div>

        {/* Parâmetros customizados para o Novo Empréstimo */}
        {!ehPagamento && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slides-in-from-top-1 duration-200">
            <div>
              <label className="block text-xs font-black uppercase text-giro-text-muted mb-2 tracking-wider">Taxa de Juros (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={taxaJurosMensal}
                onChange={e => setTaxaJurosMensal(e.target.value)}
                className="w-full text-lg font-bold p-3 bg-giro-bg rounded-xl border-0 focus:ring-2 focus:ring-giro-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-giro-text-muted mb-2 tracking-wider">Dia do Vencimento</label>
              <input 
                type="number" 
                min="1"
                max="31"
                value={diaVencimento}
                onChange={e => setDiaVencimento(e.target.value)}
                className="w-full text-lg font-bold p-3 bg-giro-bg rounded-xl border-0 focus:ring-2 focus:ring-giro-primary"
                required
              />
            </div>
          </div>
        )}
      </div>

      {/* Preview de Amortização em tempo real para Recebimento */}
      {ehPagamento && valor && obterValorNumericoDeMascara(valor) > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
              <span className="text-[10px] text-orange-700 font-black uppercase block mb-1">Juros Pagos (Liquidados)</span>
              <span className="font-bold text-orange-850 text-base">{formatarMoeda(juros)}</span>
            </div>
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              <span className="text-[10px] text-green-700 font-black uppercase block mb-1">Amortização do Principal</span>
              <span className="font-bold text-green-850 text-base">{formatarMoeda(amortizacao)}</span>
            </div>
          </div>

          {/* Distribuição detalhada por contrato ativo */}
          {detalheAlocacao.length > 0 && (
            <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
              <span className="text-[8px] font-black uppercase text-giro-text-muted tracking-wider block mb-1">Simulação de Distribuição nos Contratos</span>
              <div className="flex flex-col gap-2">
                {detalheAlocacao.map((aloc, idx) => (
                  <div key={aloc.emprestimoId} className="flex justify-between items-center text-[9px] border-b border-gray-100/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-col">
                      <span className="font-bold text-giro-text">Contrato #{aloc.emprestimoId.slice(-4) || (idx + 1)}</span>
                      <span className="text-[8px] text-giro-text-muted">Anterior: {formatarMoeda(aloc.saldoDevedorAnterior)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {aloc.jurosPagos > 0 && (
                        <span className="text-orange-700 font-bold bg-orange-50 border border-orange-100 px-1 py-0.5 rounded text-[8px]">
                          Juros: {formatarMoeda(aloc.jurosPagos)}
                        </span>
                      )}
                      {aloc.amortizado > 0 && (
                        <span className="text-green-700 font-bold bg-green-50 border border-green-100 px-1 py-0.5 rounded text-[8px]">
                          Principal: {formatarMoeda(aloc.amortizado)}
                        </span>
                      )}
                      {aloc.quitado && (
                        <span className="text-emerald-800 font-black bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded text-[7.5px] uppercase tracking-wider">
                          Quitado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input de observação */}
      <div>
        <label className="block text-xs font-black uppercase text-giro-text-muted mb-2 tracking-wider">Observação (Opcional)</label>
        <textarea 
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary min-h-[80px]"
          placeholder={ehPagamento ? "Ex: Recebido por PIX" : "Ex: Contrato de liberação emergencial"}
        />
      </div>

      <BotaoConfirmarDuploClique
        originalText={`Confirmar ${ehPagamento ? 'Recebimento' : 'Novo Empréstimo'}`}
        confirmText="Confirmar clique duplo..."
        loadingText="Processando..."
        carregando={carregando}
        disabled={ehPagamento && ativosDevedor.length === 0}
        className="nu-button-primary w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </form>
  );
}
