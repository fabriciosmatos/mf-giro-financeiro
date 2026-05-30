/**
 * Hook Customizado para o formulário de Devedor.
 * Isola estados do formulário, lógica de criação e atualização.
 * Todas as nomenclaturas e termos estão rigorosamente em português e os nomes de arquivos também.
 */

import React, { useState } from 'react';
import { Devedor, Carteira } from '../../types';
import { servicoDados } from '../../services/servicoDados';
import { auth } from '../../lib/firebase';

interface UseFormularioDevedorProps {
  onSuccess: () => void;
  devedorParaEditar?: Devedor;
  carteiras: Carteira[];
  carteiraAtivaId?: string | null;
}

export function useFormularioDevedor({
  onSuccess,
  devedorParaEditar,
  carteiras,
  carteiraAtivaId,
}: UseFormularioDevedorProps) {
  const ehDonoDoCard = !devedorParaEditar || devedorParaEditar.ownerId === auth.currentUser?.uid;

  // Se o card já existe e está numa carteira, busca essa carteira para ver as permissões de movimentação
  const devedorCarteira = devedorParaEditar?.carteiraId ? carteiras.find(c => c.id === devedorParaEditar.carteiraId) : null;
  // Pode movimentar se não tiver editando (cadastro novo), se não tiver carteira (Geral), ou se a carteira for dele (ownerId == uid)
  const podeMovimentar = !devedorParaEditar || !devedorParaEditar.carteiraId || (devedorCarteira ? devedorCarteira.ownerId === auth.currentUser?.uid : true);

  const [nomeCompleto, setNomeCompleto] = useState(devedorParaEditar?.nomeCompleto || '');
  const [whatsapp, setWhatsapp] = useState(devedorParaEditar?.whatsapp || '');
  const [endereco, setEndereco] = useState(devedorParaEditar?.endereco || '');
  const [observacoes, setObservacoes] = useState(devedorParaEditar?.observacoes || '');
  const [carteiraId, setCarteiraId] = useState(
    devedorParaEditar?.carteiraId || (carteiraAtivaId === 'sem-carteira' ? '' : carteiraAtivaId) || ''
  );
  const [carregando, setCarregando] = useState(false);

  /**
   * Processa o submit do formulário de criação/atualização
   */
  const lidarComEnvio = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCarregando(true);
    try {
      if (devedorParaEditar?.id) {
        // Se não tiver permissão para movimentar a carteira, preserva exatamente o carteiraId original
        const carteiraAlvo = podeMovimentar ? (carteiraId || null) : (devedorParaEditar.carteiraId || null);

        await servicoDados.atualizarDevedor(devedorParaEditar.id, {
          nomeCompleto,
          whatsapp,
          taxaJurosMensal: devedorParaEditar.taxaJurosMensal || 0,
          diaVencimento: devedorParaEditar.diaVencimento || 1,
          endereco: endereco || '',
          observacoes: observacoes || '',
          carteiraId: carteiraAlvo,
        });
      } else {
        await servicoDados.criarDevedor({
          nomeCompleto,
          whatsapp,
          taxaJurosMensal: 0,
          saldoDevedorAtual: 0,
          diaVencimento: 1,
          dataCriacao: new Date(),
          endereco: endereco || '',
          observacoes: observacoes || '',
          ownerId: '',
          carteiraId: carteiraId || null,
        });
      }
      onSuccess();
    } catch (erro) {
      console.error('Erro ao salvar dados do devedor:', erro);
      alert('Erro ao salvar os dados do devedor');
    } finally {
      setCarregando(false);
    }
  };

  return {
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
  };
}
