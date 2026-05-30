/**
 * Hook Customizado para gerenciar a lógica de um único Cartão de Devedor (cliente).
 * Trata o controle do menu de opções, formatação das mensagens do WhatsApp e cálculo de juros.
 * Todas as nomenclaturas, funções e lógicas estão estritamente em PORTUGUÊS.
 */

import { useState } from 'react';
import { Devedor } from '../../types';
import { getInfoStatus, obterDadosFiscaisConsolidados } from '../../lib/financeiro/statusLogic';
import { formatarMoeda } from '../../lib/utils';

interface UseCartaoDevedorProps {
  devedor: Devedor;
}

export function useCartaoDevedor({ devedor }: UseCartaoDevedorProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  // Iniciais do nome para avatar visual
  const iniciaisNome = devedor.nomeCompleto
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const consol = obterDadosFiscaisConsolidados(devedor);
  const mesesDevidos = consol.mesesDevidos;
  const jurosAcumulados = consol.jurosAcumulados;
  const jurosMensalSimples = consol.jurosMensalSimples;

  const statusInfo = getInfoStatus(devedor);

  // Lógica de exibição de data de vencimento/atraso
  const temEmprestimos = devedor.emprestimos && devedor.emprestimos.length > 0;
  let dataExibicao = devedor.dataCriacao 
    ? (devedor.dataCriacao.toDate ? devedor.dataCriacao.toDate() : new Date(devedor.dataCriacao)) 
    : new Date();
  let tipoLabelData = 'Cadastrado em';

  if (temEmprestimos) {
    dataExibicao = consol.dataPrimeiroVencimento;
    tipoLabelData = 'Vencimento';

    if (consol.saldoDevedorAtual > 0) {
      if (mesesDevidos > 0) {
        dataExibicao = consol.dataPrimeiroVencimento;
        tipoLabelData = 'Atrasado desde';
      } else if (statusInfo.label === 'Vence Hoje' || statusInfo.label === 'Vence Amanhã') {
        dataExibicao = consol.dataPrimeiroVencimento;
        tipoLabelData = 'Vencimento';
      } else {
        dataExibicao = consol.dataProximoVencimento;
        tipoLabelData = 'Próximo';
      }
    }
  }

  const formatarDataLocal = (dataObj: Date) => {
    const d = dataObj.getDate().toString().padStart(2, '0');
    const m = (dataObj.getMonth() + 1).toString().padStart(2, '0');
    const y = dataObj.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const dataTextoFormatada = formatarDataLocal(dataExibicao);

  /**
   * Constrói a mensagem padrão personalizada para envio de cobrança via WhatsApp
   */
  const obterMensagemWhatsApp = () => {
    const primeiroNome = devedor.nomeCompleto.split(' ')[0];
    const saldo = formatarMoeda(consol.saldoDevedorAtual);
    const juroMes = formatarMoeda(jurosMensalSimples);
    const acumulado = formatarMoeda(jurosAcumulados);

    if (consol.saldoDevedorAtual === 0) {
      return `Olá ${primeiroNome}, parabéns! Seu saldo no Giro está quitado. Obrigado pela parceria!`;
    }

    if (statusInfo.label === 'Vence Hoje') {
      return `Olá ${primeiroNome}, lembrete do seu vencimento de HOJE (${dataTextoFormatada}). O valor para renovar seu saldo de ${saldo} é ${juroMes}. Como prefere pagar?`;
    }

    if (statusInfo.label === 'Vence Amanhã') {
      return `Olá ${primeiroNome}, passando para avisar que seu vencimento no Giro é AMANHÃ (${dataTextoFormatada}). O valor para renovar o saldo de ${saldo} é ${juroMes}. Já quer adiantar?`;
    }

    if (statusInfo.isAtrasado) {
      if (mesesDevidos > 1) {
        return `Olá ${primeiroNome}, identifiquei que seu vencimento do dia ${dataTextoFormatada} está em atraso e acumulou ${mesesDevidos} meses. O valor total para regularizar seu saldo de ${saldo} é ${acumulado}. Podemos combinar o acerto?`;
      }
      return `Olá ${primeiroNome}, seu vencimento do dia ${dataTextoFormatada} está em atraso. O valor para renovar seu saldo de ${saldo} é ${juroMes}. Como podemos resolver?`;
    }

    return `Olá ${primeiroNome}, tudo bem? Seu saldo atual no Giro é ${saldo}. O valor da sua próxima renovação (${dataTextoFormatada}) será ${juroMes}.`;
  };

  const urlWhatsApp = `https://wa.me/55${devedor.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(obterMensagemWhatsApp())}`;

  return {
    menuAberto,
    setMenuAberto,
    iniciaisNome,
    mesesDevidos,
    jurosAcumulados,
    jurosMensalSimples,
    statusInfo,
    tipoLabelData,
    dataTextoFormatada,
    urlWhatsApp,
    saldoDevedorAtual: consol.saldoDevedorAtual,
  };
}
