/**
 * Hook Customizado para o formulário de Devedor.
 * Isola estados do formulário, lógica de criação e atualização.
 * Todas as nomenclaturas e termos estão rigorosamente em português e os nomes de arquivos também.
 */

import React, { useState } from 'react';
import { Devedor } from '../../types';
import { servicoDados } from '../../services/servicoDados';

interface UseFormularioDevedorProps {
  onSuccess: () => void;
  devedorParaEditar?: Devedor;
  carteiraAtivaId?: string | null;
}

export function useFormularioDevedor({
  onSuccess,
  devedorParaEditar,
  carteiraAtivaId,
}: UseFormularioDevedorProps) {
  const [nomeCompleto, setNomeCompleto] = useState(devedorParaEditar?.nomeCompleto || '');
  const [whatsapp, setWhatsapp] = useState(devedorParaEditar?.whatsapp || '');
  const [taxaJuros, setTaxaJuros] = useState(devedorParaEditar?.taxaJurosMensal.toString() || '10');
  const [saldoDevedor, setSaldoDevedor] = useState(devedorParaEditar?.saldoDevedorAtual.toString() || '');
  const [endereco, setEndereco] = useState(devedorParaEditar?.endereco || '');
  const [observacoes, setObservacoes] = useState(devedorParaEditar?.observacoes || '');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [diaVencimento, setDiaVencimento] = useState(
    devedorParaEditar?.diaVencimento?.toString() || new Date().getDate().toString()
  );
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
        await servicoDados.atualizarDevedor(devedorParaEditar.id, {
          nomeCompleto,
          whatsapp,
          taxaJurosMensal: Number(taxaJuros),
          diaVencimento: Number(diaVencimento),
          endereco: endereco || '',
          observacoes: observacoes || '',
          carteiraId: carteiraId || null,
        });
      } else {
        await servicoDados.criarDevedor({
          nomeCompleto,
          whatsapp,
          taxaJurosMensal: Number(taxaJuros),
          saldoDevedorAtual: Number(saldoDevedor),
          diaVencimento: Number(diaVencimento),
          dataCriacao: new Date(dataInicio + 'T12:00:00'),
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
  };
}
