/**
 * Componente Visual FormularioTransacao.
 * Implementa apenas o design do formulário de transações de Aporte/Recebimento.
 * Todas as nomenclaturas e textos em português e os nomes de arquivos também.
 */

import React from 'react';
import { Devedor, TipoTransacao } from '../../types';
import { useFormularioTransacao } from './useFormularioTransacao';
import { formatarMoeda } from '../../lib/utils';

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
    observacao,
    setObservacao,
    carregando,
    juros,
    amortizacao,
    lidarComEnvio,
  } = useFormularioTransacao({ devedor, tipo, onSuccess });

  return (
    <form onSubmit={lidarComEnvio} className="flex flex-col gap-6 text-giro-text">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2 lg:col-span-1">
          <span className="text-xs text-giro-text-muted uppercase font-bold tracking-wider mb-1 block">Saldo Devedor Atual</span>
          <span className="text-xl font-bold">{formatarMoeda(devedor.saldoDevedorAtual)}</span>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2 lg:col-span-1">
          <label className="text-xs text-giro-text-muted uppercase font-bold tracking-wider mb-1 block">Data da Transação</label>
          <input 
            type="date"
            value={dataTransacao}
            onChange={e => setDataTransacao(e.target.value)}
            className="bg-transparent font-bold w-full outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Valor da Transação (R$)</label>
        <input 
          type="number" 
          step="0.01"
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder="0,00"
          className="w-full text-2xl font-bold p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
          required
        />
      </div>

      {tipo === 'PAGAMENTO' && valor && Number(valor) > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-orange-50 rounded-xl">
            <span className="text-[10px] text-orange-700 font-bold uppercase block mb-1">Juros (Liquidado)</span>
            <span className="font-bold text-orange-800">{formatarMoeda(juros)}</span>
          </div>
          <div className="p-3 bg-green-50 rounded-xl">
            <span className="text-[10px] text-green-700 font-bold uppercase block mb-1">Amortização</span>
            <span className="font-bold text-green-800">{formatarMoeda(amortizacao)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-2">Observação (Opcional)</label>
        <textarea 
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary min-h-[80px]"
          placeholder="Ex: Pago via PIX"
        />
      </div>

      <button disabled={carregando} type="submit" className="nu-button-primary w-full cursor-pointer">
        {carregando ? 'Processando...' : `Confirmar ${tipo === 'PAGAMENTO' ? 'Recebimento' : 'Aporte'}`}
      </button>
    </form>
  );
}
