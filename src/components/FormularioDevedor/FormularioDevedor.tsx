/**
 * Componente Visual FormularioDevedor.
 * Mantém apenas o design JSX e interage puramente com o hook useFormularioDevedor.
 * Todas as nomenclaturas, termos e textos estão em português e os nomes de arquivos também.
 */

import React from 'react';
import { Devedor, Carteira } from '../../types';
import { useFormularioDevedor } from './useFormularioDevedor';
import { BotaoConfirmarDuploClique } from '../BotaoConfirmarDuploClique';

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
    endereco,
    setEndereco,
    observacoes,
    setObservacoes,
    carteiraId,
    setCarteiraId,
    carregando,
    lidarComEnvio,
    podeMovimentar,
  } = useFormularioDevedor({
    onSuccess,
    devedorParaEditar,
    carteiras,
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

      <div className="grid grid-cols-1 gap-4">
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
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 tracking-tight">Carteira (Segmentação)</label>
        <select
          value={carteiraId}
          onChange={e => setCarteiraId(e.target.value)}
          disabled={!podeMovimentar}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary font-bold text-sm text-giro-text disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="">Geral</option>
          {carteiras.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        {!podeMovimentar && (
          <p className="text-[10px] font-bold text-amber-600 mt-1.5 uppercase tracking-tight">
            ⚠ Apenas o proprietário desta carteira pode transferir este card.
          </p>
        )}
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

      <BotaoConfirmarDuploClique
        originalText={devedorParaEditar ? 'Atualizar Cadastro' : 'Salvar Novo Devedor'}
        confirmText="Confirmar clique duplo..."
        loadingText="Salvando..."
        carregando={carregando}
        className="nu-button-primary w-full mt-2 cursor-pointer"
      />
    </form>
  );
}
