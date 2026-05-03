/**
 * Regras puras para cálculos de juros.
 */

export function calcularMesesDevidos(diaVencimento: number, dataReferencia: Date): number {
  const hoje = new Date();
  let meses = 0;
  
  let dataCiclo = new Date(dataReferencia);
  dataCiclo.setHours(0, 0, 0, 0);

  // Se a referência é hoje ou no futuro (mesmo mês), ainda não venceu
  if (dataCiclo.getMonth() === hoje.getMonth() && dataCiclo.getFullYear() === hoje.getFullYear()) {
    // Só vence se o dia de hoje for >= vencimento E a referência for anterior ao vencimento
    // Mas a regra de negócio solicitada diz que no mês de cadastro não vence.
    return 0;
  }

  if (dataCiclo.getDate() >= diaVencimento) {
    dataCiclo.setMonth(dataCiclo.getMonth() + 1);
  }
  dataCiclo.setDate(diaVencimento);

  while (dataCiclo <= hoje) {
    meses++;
    dataCiclo.setMonth(dataCiclo.getMonth() + 1);
  }

  return meses;
}

export function calcularJurosAcumulados(saldo: number, taxa: number, meses: number): number {
  return Number((saldo * (taxa / 100) * meses).toFixed(2));
}

export function calcularJurosDoPeriodo(saldo: number, taxa: number): number {
  return Number((saldo * (taxa / 100)).toFixed(2));
}
