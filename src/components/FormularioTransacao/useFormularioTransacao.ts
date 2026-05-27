/**
 * Hook Customizado para gerenciar a lógica de transações do devedor (Aporte / Pagamento).
 * Todas as variáveis, funções e retornos estão rigorosamente em PORTUGUÊS.
 */

import React, { useState } from 'react';
import { Devedor, TipoTransacao } from '../../types';
import { obterJurosEstimados } from './FormularioTransacao.utils';
import { decomporPagamento } from '../../lib/financeiro/amortizacao';
import { gestorTransacoes } from '../../lib/gestorTransacoes';

interface UseFormularioTransacaoProps {
  devedor: Devedor;
  tipo: TipoTransacao;
  onSuccess: () => void;
}

export function useFormularioTransacao({
  devedor,
  tipo,
  onSuccess,
}: UseFormularioTransacaoProps) {
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().split('T')[0]);
  const [carregando, setCarregando] = useState(false);

  // Calcula juros estimado para inicialização opcional do input
  const jurosEstimado = obterJurosEstimados(devedor);

  // Valor inicial sugerido se for pagamento de juros
  const [valor, setValor] = useState(tipo === 'PAGAMENTO' ? jurosEstimado.toString() : '');
  const [observacao, setObservacao] = useState('');

  // Decompõe o pagamento em juros amortizados
  const { juros, amortizacao } = decomporPagamento(Number(valor) || 0, jurosEstimado);

  /**
   * Processa o submit de transações no gateway de dados correspondente
   */
  const lidarComEnvio = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const valorNumerico = Number(valor);
    if (!valorNumerico || valorNumerico <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    setCarregando(true);
    try {
      if (tipo === 'PAGAMENTO') {
        await gestorTransacoes.processarPagamento(devedor, {
          valor: valorNumerico,
          observacao,
          data: dataTransacao,
        });
      } else {
        await gestorTransacoes.processarAporte(devedor, {
          valor: valorNumerico,
          observacao,
          data: dataTransacao,
        });
      }
      onSuccess();
    } catch (erro) {
      console.error('Erro ao processar transação:', erro);
      alert('Erro ao processar a transação financeira.');
    } finally {
      setCarregando(false);
    }
  };

  return {
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
  };
}
