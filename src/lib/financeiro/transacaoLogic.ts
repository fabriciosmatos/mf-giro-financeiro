import { Devedor, Historico } from '../../types';
import { calcularMesesDevidos, calcularJurosAcumulados } from './juros';
import { decomporPagamento, simularNovoSaldo } from './amortizacao';

/**
 * Lógica pura para determinar o resultado de uma transação.
 * Não depende de Firestore.
 */

export interface ResultadoTransacao {
  novoSaldo: number;
  jurosPagos: number;
  amortizacao: number;
  lucroAcumulado: number;
}

export function calcularResultadoPagamento(devedor: Devedor, valorPago: number): ResultadoTransacao {
  const diaVencimento = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date().getDate());
  const dataReferencia = devedor.ultimoPagamento 
    ? (devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento))
    : (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate() : new Date());

  const mesesDevidosReal = calcularMesesDevidos(diaVencimento, dataReferencia);
  
  // No Giro, se o usuário está pagando, geralmente ele está pagando o juro do mês atual
  // Mesmo que o mês não tenha "virado" no calendário de juros acumulados,
  // se mesesDevidosReal for 0, permitimos que a transação liquide até 1 mês de juros estimando o período.
  const mesesParaCobrar = mesesDevidosReal > 0 ? mesesDevidosReal : 1;
  
  const jurosDevidos = calcularJurosAcumulados(devedor.saldoDevedorAtual, devedor.taxaJurosMensal, mesesParaCobrar);
  
  const { juros, amortizacao } = decomporPagamento(valorPago, jurosDevidos);
  const novoSaldo = simularNovoSaldo(devedor.saldoDevedorAtual, amortizacao, 'AMORTIZACAO');

  return {
    novoSaldo,
    jurosPagos: juros,
    amortizacao,
    lucroAcumulado: Number(((devedor.totalLucroGerado || 0) + juros).toFixed(2))
  };
}
