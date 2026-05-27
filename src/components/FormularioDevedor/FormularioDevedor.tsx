/**
 * Componente Visual FormularioDevedor.
 * Mantém apenas o design JSX e interage puramente com o hook useFormularioDevedor.
 * Todas as nomenclaturas, termos e textos estão em português e os nomes de arquivos também.
 */

import React from 'react';
import { Devedor, Carteira } from '../../types';
import { useFormularioDevedor } from './useFormularioDevedor';

interface FormularioDevedorProps {
  onSuccess: () => void;
  devedorParaEditar?: Devedor;
  carteiras: Carteira[];
  carteiraAtivaId?: string | null;
}

export function FormularioDevedor({
  onSuccess,
  devedorParaEditar,
  carteiras,
  carteiraAtivaId,
}: FormularioDevedorProps) {
  const {
    nomeCompleto,
    setNomeCompleto,
    whatsapp,
    setWhatsapp,
    taxaJuros,
    setTaxaJuros,
    saldoDevedor,
    setSaldoDevedor,
    endereco,
    setEndereco,
    observacoes,
    setObservacoes,
    dataInicio,
    setDataInicio,
    diaVencimento,
    setDiaVencimento,
    carteiraId,
    setCarteiraId,
    carregando,
    lidarComEnvio,
  } = useFormularioDevedor({
    onSuccess,
    devedorParaEditar,
    carteiraAtivaId,
  });

  return (
    <form onSubmit={lidarComEnvio} className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-semibold mb-2 tracking-tight">Nome Completo</label>
        <input 
          type="text" 
          value={nomeCompleto}
          onChange={e => setNomeCompleto(e.target.value)}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
          placeholder="Ex: João da Silva"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">WhatsApp</label>
          <input 
            type="tel" 
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
            placeholder="11999999999"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Taxa Juros (%)</label>
          <input 
            type="number" 
            value={taxaJuros}
            onChange={e => setTaxaJuros(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Dia do Vencimento</label>
          <input 
            type="number" 
            min="1"
            max="31"
            value={diaVencimento}
            onChange={e => setDiaVencimento(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
            required
          />
        </div>
        {!devedorParaEditar && (
          <div>
            <label className="block text-sm font-semibold mb-2">Data de Início</label>
            <input 
              type="date" 
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
              required
            />
          </div>
        )}
      </div>

      {!devedorParaEditar && (
        <div>
          <label className="block text-sm font-semibold mb-2">Saldo Devedor Inicial (R$)</label>
          <input 
            type="number" 
            step="0.01"
            value={saldoDevedor}
            onChange={e => setSaldoDevedor(e.target.value)}
            className="w-full text-xl font-bold p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary font-mono"
            placeholder="0,00"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-2 tracking-tight">Carteira (Segmentação)</label>
        <select
          value={carteiraId}
          onChange={e => setCarteiraId(e.target.value)}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary font-bold text-sm text-giro-text"
        >
          <option value="">Geral</option>
          {carteiras.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 tracking-tight">Endereço (Opcional)</label>
        <textarea 
          value={endereco}
          onChange={e => setEndereco(e.target.value)}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary min-h-[80px]"
          placeholder="Ex: Rua das Flores, 123 - Centro"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 tracking-tight">Observações Gerais (Opcional)</label>
        <textarea 
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary min-h-[80px]"
          placeholder="Notas importantes sobre o cliente..."
        />
      </div>

      <button disabled={carregando} type="submit" className="nu-button-primary w-full mt-2 cursor-pointer">
        {carregando ? 'Salvando...' : devedorParaEditar ? 'Atualizar Cadastro' : 'Salvar Novo Devedor'}
      </button>
    </form>
  );
}
