/**
 * Hook Customizado useSeletorCarteiras.
 * Isola toda a lógica de estado, formulários e efeitos colaterais de gerenciamento de carteiras.
 * Todas as nomenclaturas, comentários e funções estão rigorosamente em PORTUGUÊS.
 */

import React, { useState } from 'react';

interface UseSeletorCarteirasProps {
  onCreateWallet: (nome: string) => Promise<string>;
  onDeleteWallet: (id: string) => Promise<void>;
}

export function useSeletorCarteiras({
  onCreateWallet,
  onDeleteWallet,
}: UseSeletorCarteirasProps) {
  const [novaCarteiraNome, setNovaCarteiraNome] = useState('');
  const [estaCriando, setEstaCriando] = useState(false);
  const [idConfirmarExclusao, setIdConfirmarExclusao] = useState<string | null>(null);

  /**
   * Trata a submissão de formulário criando uma nova carteira segmentada
   */
  const lidarComCriacao = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!novaCarteiraNome.trim()) return;
    setEstaCriando(true);
    try {
      await onCreateWallet(novaCarteiraNome);
      setNovaCarteiraNome('');
    } catch (erro) {
      console.error('Erro ao instanciar carteira:', erro);
    } finally {
      setEstaCriando(false);
    }
  };

  /**
   * Trata a requisição de exclusão permanente de uma carteira
   */
  const lidarComExclusao = async (id: string, evento: React.MouseEvent) => {
    evento.stopPropagation();
    try {
      await onDeleteWallet(id);
      setIdConfirmarExclusao(null);
    } catch (erro) {
      console.error('Erro ao deletar carteira:', erro);
    }
  };

  return {
    novaCarteiraNome,
    setNovaCarteiraNome,
    estaCriando,
    idConfirmarExclusao,
    setIdConfirmarExclusao,
    lidarComCriacao,
    lidarComExclusao,
  };
}
