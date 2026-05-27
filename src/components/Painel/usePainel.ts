/**
 * Hook Customizado para gerenciar toda a lógica do Painel de Controle.
 * Isola estados do componente visual, efeitos de exclusão e validação.
 * Todas as nomenclaturas e funções estão rigorosamente em PORTUGUÊS.
 */

import { useState } from 'react';
import { Devedor } from '../../types';
import { servicoDados } from '../../services/servicoDados';

interface UsePainelProps {
  statusSelecionados: ('ATRASO' | 'DIA' | 'QUITADO')[];
  setStatusSelecionados: (status: ('ATRASO' | 'DIA' | 'QUITADO')[]) => void;
  refresh: () => Promise<void>;
}

export function usePainel({
  statusSelecionados,
  setStatusSelecionados,
  refresh,
}: UsePainelProps) {
  // Controle de busca
  const [estaBuscando, setEstaBuscando] = useState(false);

  // Estados dos Modais
  const [modalNovoDevedor, setModalNovoDevedor] = useState(false);
  const [modalEditarDevedor, setModalEditarDevedor] = useState(false);
  const [devedorSelecionado, setDevedorSelecionado] = useState<Devedor | null>(null);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalAporte, setModalAporte] = useState(false);
  const [modalHistorico, setModalHistorico] = useState(false);
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState(false);

  // Controle de Menus Dropdown
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [ordenacaoAberta, setOrdenacaoAberta] = useState(false);

  // Loading específico das ações do painel
  const [processandoAcao, setProcessandoAcao] = useState(false);

  /**
   * Remove permanentemente o cliente cadastro.
   * Isola o efeito colateral de chamada ao banco de dados (Firestore)
   */
  const tratarExcluirCliente = async () => {
    if (!devedorSelecionado) return;
    setProcessandoAcao(true);
    try {
      await servicoDados.excluirDevedor(devedorSelecionado.id);
      setModalConfirmarExclusao(false);
      setDevedorSelecionado(null);
      await refresh();
    } catch (erro) {
      console.error('Erro ao excluir cliente:', erro);
    } finally {
      setProcessandoAcao(false);
    }
  };

  /**
   * Gerencia seleção múltipla de filtros de status garantindo integridade.
   */
  const alternarFiltroStatus = (status: 'ATRASO' | 'DIA' | 'QUITADO') => {
    if (statusSelecionados.includes(status)) {
      if (statusSelecionados.length > 1) {
        setStatusSelecionados(statusSelecionados.filter(s => s !== status));
      }
    } else {
      setStatusSelecionados([...statusSelecionados, status]);
    }
  };

  return {
    estaBuscando,
    setEstaBuscando,
    modalNovoDevedor,
    setModalNovoDevedor,
    modalEditarDevedor,
    setModalEditarDevedor,
    devedorSelecionado,
    setDevedorSelecionado,
    modalPagamento,
    setModalPagamento,
    modalAporte,
    setModalAporte,
    modalHistorico,
    setModalHistorico,
    modalConfirmarExclusao,
    setModalConfirmarExclusao,
    filtroAberto,
    setFiltroAberto,
    ordenacaoAberta,
    setOrdenacaoAberta,
    processandoAcao,
    tratarExcluirCliente,
    alternarFiltroStatus,
  };
}
