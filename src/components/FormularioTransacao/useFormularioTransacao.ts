/**
 * Hook Customizado useFormularioTransacao.
 * Gerencia o estado e orquestra ações de Aporte/Novo Empréstimo e Recebimentos.
 * Rigorosamente em português.
 */

import React, { useState, useEffect } from 'react';
import { Devedor, TipoTransacao } from '../../types';
import { 
  obterJurosEstimadosDevedor, 
  decomporPagamentoMulticontrato,
  TipoAmortizacao
} from './FormularioTransacao.financeiro';
import { FormularioTransacaoBanco } from './FormularioTransacao.banco';
import { obterValorNumericoDeMascara, formatarNumeroParaMascara } from '../../lib/utils';

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
  const [tipoAmortizacao, setTipoAmortizacao] = useState<TipoAmortizacao>('automatico');

  // Seleção do contrato a abater (tipo === 'PAGAMENTO')
  const ativos = (devedor.emprestimos || []).filter(e => e.status === 'ATIVO');
  const [emprestimoIdSelecionado, setEmprestimoIdSelecionado] = useState(ativos[0]?.id || '');

  // Valores iniciais e complementares para Novo Empréstimo (tipo === 'APORTE')
  const defaultTaxa = devedor.taxaJurosMensal?.toString() || '10';
  const defaultDiaVenc = devedor.diaVencimento?.toString() || new Date().getDate().toString();

  const [taxaJurosMensal, setTaxaJurosMensal] = useState(defaultTaxa);
  const [diaVencimento, setDiaVencimento] = useState(defaultDiaVenc);

  // Conversão segura da data da transação para objeto Date de cálculo retroativo
  const dataRefObj = dataTransacao ? new Date(dataTransacao + 'T12:00:00') : undefined;

  // Juros estimado para pagamento (tipo === 'PAGAMENTO')
  const jurosEstimado = obterJurosEstimadosDevedor(devedor, emprestimoIdSelecionado || undefined, tipoAmortizacao, dataRefObj);

  // Valor inicial sugerido se for recebimento/pagamento, senão vazio
  const [valor, setValor] = useState('');
  const [observacao, setObservacao] = useState('');

  // Atualiza o valor sugerido sempre que mudar de contrato ativo, modo de amortização ou data de pagamento
  useEffect(() => {
    if (tipo === 'PAGAMENTO') {
      const dataRef = dataTransacao ? new Date(dataTransacao + 'T12:00:00') : undefined;
      const estimado = obterJurosEstimadosDevedor(devedor, emprestimoIdSelecionado || undefined, tipoAmortizacao, dataRef);
      setValor(formatarNumeroParaMascara(estimado));
    }
  }, [emprestimoIdSelecionado, tipo, tipoAmortizacao, dataTransacao, devedor]);

  // Calcula tempo real de decomposição de juros e amortização para feedback na tela
  const decomposicaoRealTime = decomporPagamentoMulticontrato(
    obterValorNumericoDeMascara(valor) || 0, 
    devedor, 
    emprestimoIdSelecionado || undefined,
    tipoAmortizacao,
    dataRefObj
  );
  const juros = decomposicaoRealTime.jurosPagos;
  const amortizacao = decomposicaoRealTime.amortizacaoPaga;

  /**
   * Envia as alterações para o controlador de persistência atômica
   */
  const lidarComEnvio = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const valorNumerico = obterValorNumericoDeMascara(valor);
    if (!valorNumerico && valorNumerico !== 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    if (valorNumerico < 0) {
      alert('Por favor, insira um valor maior ou igual a zero.');
      return;
    }

    if (tipo === 'PAGAMENTO' && ativos.length > 0 && !emprestimoIdSelecionado) {
      alert('Por favor, selecione qual contrato será abatido.');
      return;
    }

    setCarregando(true);
    try {
      if (tipo === 'PAGAMENTO') {
        await FormularioTransacaoBanco.registrarPagamentoNoBanco(
          devedor,
          valorNumerico,
          dataTransacao,
          observacao,
          emprestimoIdSelecionado || undefined,
          tipoAmortizacao
        );
      } else {
        // Trata Novo Empréstimo com taxas e vencimentos específicos salvos separadamente
        await FormularioTransacaoBanco.criarNovoEmprestimoNoBanco(
          devedor,
          valorNumerico,
          Number(taxaJurosMensal),
          Number(diaVencimento),
          dataTransacao,
          observacao
        );
      }
      onSuccess();
    } catch (erro: any) {
      console.error('Erro ao processar transação financeira:', erro);
      alert('Erro ao processar a operação: ' + (erro.message || 'Erro desconhecido.'));
    } finally {
      setCarregando(false);
    }
  };

  return {
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
    detalheAlocacao: decomposicaoRealTime.detalhePorEmprestimo,
    emprestimoIdSelecionado,
    setEmprestimoIdSelecionado,
    ativosDevedor: ativos,
    tipoAmortizacao,
    setTipoAmortizacao,
  };
}
