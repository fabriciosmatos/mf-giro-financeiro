/**
 * Lógica de amortização e movimentação de saldo.
 */

export function decomporPagamento(valorRecebido: number, jurosDevidos: number): { juros: number; amortizacao: number } {
  const jurosPagos = Math.min(valorRecebido, jurosDevidos);
  const amortizacao = Math.max(0, valorRecebido - jurosPagos);
  return {
    juros: Number(jurosPagos.toFixed(2)),
    amortizacao: Number(amortizacao.toFixed(2)),
  };
}

export function simularNovoSaldo(saldoAtual: number, valorAlteracao: number, tipo: 'AMORTIZACAO' | 'APORTE'): number {
  if (tipo === 'AMORTIZACAO') {
    return Number(Math.max(0, saldoAtual - valorAlteracao).toFixed(2));
  }
  return Number((saldoAtual + valorAlteracao).toFixed(2));
}

export function validarEntradaFinanceira(valor: number): boolean {
  return !isNaN(valor) && valor > 0;
}
