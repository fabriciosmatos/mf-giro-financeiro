import React, { useState } from 'react';
import { Devedor, TipoTransacao } from '../types';
import { gestorTransacoes } from '../lib/gestorTransacoes';
import { calcularJurosDoPeriodo } from '../lib/financeiro/juros';
import { decomporPagamento } from '../lib/financeiro/amortizacao';
import { formatarMoeda } from '../lib/utils';

interface FormTransacaoProps {
  devedor: Devedor;
  tipo: TipoTransacao;
  onSuccess: () => void;
}

export default function FormTransacao({ devedor, tipo, onSuccess }: FormTransacaoProps) {
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const diaVencimento = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date().getDate());
  
  const jurosEstimado = (() => {
    const saldo = devedor.saldoDevedorAtual;
    const taxa = devedor.taxaJurosMensal;
    return calcularJurosDoPeriodo(saldo, taxa);
  })();

  const [valor, setValor] = useState(tipo === 'PAGAMENTO' ? jurosEstimado.toString() : '');
  const [obs, setObs] = useState('');

  const { juros, amortizacao } = decomporPagamento(Number(valor) || 0, jurosEstimado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(valor);
    if (!v || v <= 0) return alert('Insira um valor válido');
    
    setLoading(true);
    try {
      if (tipo === 'PAGAMENTO') {
        await gestorTransacoes.processarPagamento(devedor, { valor: v, observacao: obs, data });
      } else {
        await gestorTransacoes.processarAporte(devedor, { valor: v, observacao: obs, data });
      }
      onSuccess();
    } catch (e) {
      alert('Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2 lg:col-span-1">
          <span className="text-xs text-giro-text-muted uppercase font-bold tracking-wider mb-1 block">Saldo Devedor Atual</span>
          <span className="text-xl font-bold">{formatarMoeda(devedor.saldoDevedorAtual)}</span>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2 lg:col-span-1">
          <label className="text-xs text-giro-text-muted uppercase font-bold tracking-wider mb-1 block">Data da Transação</label>
          <input 
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
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
          value={obs}
          onChange={e => setObs(e.target.value)}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary min-h-[80px]"
          placeholder="Ex: Pago via PIX"
        />
      </div>

      <button disabled={loading} type="submit" className="nu-button-primary w-full">
        {loading ? 'Processando...' : `Confirmar ${tipo === 'PAGAMENTO' ? 'Recebimento' : 'Aporte'}`}
      </button>
    </form>
  );
}
