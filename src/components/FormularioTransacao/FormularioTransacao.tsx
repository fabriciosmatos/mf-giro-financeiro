/**
 * Componente Visual FormularioTransacao.
 * Implementa apenas o design do formulário de transações.
 * Rigorosamente em português.
 */

import React from 'react';
import { Devedor, TipoTransacao } from '../../types';
import { useFormularioTransacao } from './useFormularioTransacao';
import { formatarMoeda, aplicarMascaraDinheiro, obterValorNumericoDeMascara } from '../../lib/utils';
import { BotaoConfirmarDuploClique } from '../BotaoConfirmarDuploClique';

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
  } = useFormularioTransacao({ devedor, tipo, onSuccess });

  const ehPagamento = tipo === 'PAGAMENTO';

  return (
    <form onSubmit={lidarComEnvio} className="flex flex-col gap-6 text-giro-text">
      
      {/* Resumo ou data da operação */}
      <div className="grid grid-cols-2 gap-4">
        {ehPagamento ? (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2 lg:col-span-1">
            <span className="text-xs text-giro-text-muted uppercase font-bold tracking-wider mb-1 block">Juros Estimados Acumulados</span>
            <span className="text-xl font-black text-orange-600">{formatarMoeda(jurosEstimado)}</span>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2 lg:col-span-1">
            <span className="text-xs text-giro-text-muted uppercase font-bold tracking-wider mb-1 block">Capital Atual na Rua</span>
            <span className="text-xl font-black text-giro-primary">{formatarMoeda(devedor.saldoDevedorAtual || 0)}</span>
          </div>
        )}
        
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2 lg:col-span-1">
          <label className="text-xs text-giro-text-muted uppercase font-bold tracking-wider mb-1 block">
            {ehPagamento ? 'Data do Recebimento' : 'Data de Liberação'}
          </label>
          <input 
            type="date"
            value={dataTransacao}
            onChange={e => setDataTransacao(e.target.value)}
            className="bg-transparent font-bold w-full outline-none text-giro-text cursor-pointer"
          />
        </div>
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
                className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary text-sm font-bold text-giro-text"
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
