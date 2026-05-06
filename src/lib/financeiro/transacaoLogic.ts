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
  mesesLiquidados: number;
}

export function calcularResultadoPagamento(devedor: Devedor, valorPago: number): ResultadoTransacao {
  const diaVencimento = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date().getDate());
  const dataReferencia = devedor.ultimoPagamento 
    ? (devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento))
    : (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate() : new Date());

  const mesesDevidosReal = calcularMesesDevidos(diaVencimento, dataReferencia);
  const juroMensal = Number((devedor.saldoDevedorAtual * (devedor.taxaJurosMensal / 100)).toFixed(2));
  
  // No Giro, consideramos pelo menos 1 mês se estiver pagando algo e estiver "em dia"
  const mesesParaCobrar = mesesDevidosReal > 0 ? mesesDevidosReal : 1;
  const jurosTotaisAcumulados = calcularJurosAcumulados(devedor.saldoDevedorAtual, devedor.taxaJurosMensal, mesesParaCobrar);
  
  const { juros, amortizacao } = decomporPagamento(valorPago, jurosTotaisAcumulados);
  const novoSaldo = simularNovoSaldo(devedor.saldoDevedorAtual, amortizacao, 'AMORTIZACAO');

  // Determinar quantos meses foram quitados (inteiros)
  const mesesLiquidados = juroMensal > 0 ? Math.floor(juros / juroMensal) : 0;

  return {
    novoSaldo,
    jurosPagos: juros,
    amortizacao,
    lucroAcumulado: Number(((devedor.totalLucroGerado || 0) + juros).toFixed(2)),
    mesesLiquidados
  };
}
