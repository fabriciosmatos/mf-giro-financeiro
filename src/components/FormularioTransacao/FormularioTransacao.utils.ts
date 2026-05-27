/**
 * Funções puras utilitárias para o formulário de Transação.
 * Todas as nomenclaturas, comentários e termos estão rigorosamente em português.
 */

import { Devedor } from '../../types';
import { calcularMesesDevidos, calcularJurosAcumulados } from '../../lib/financeiro/juros';

/**
 * Calcula a estimativa de juros a partir do histórico de último pagamento do devedor.
 */
export function obterJurosEstimados(devedor: Devedor): number {
  const saldo = devedor.saldoDevedorAtual;
  const taxa = devedor.taxaJurosMensal;

  const diaVencimento = devedor.diaVencimento || (
    devedor.dataCriacao?.toDate 
      ? devedor.dataCriacao.toDate().getDate() 
      : new Date(devedor.dataCriacao || '').getDate()
  );

  const dataReferencia = devedor.ultimoPagamento 
    ? (devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento))
    : (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate() : new Date());

  const meses = calcularMesesDevidos(diaVencimento, dataReferencia);
  const mesesParaCobrar = meses > 0 ? meses : 1;

  return calcularJurosAcumulados(saldo, taxa, mesesParaCobrar);
}
