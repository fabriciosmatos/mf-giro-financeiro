/**
 * Regras puras para cálculos de juros.
 */

export interface DetalheCobranca {
  mesesDevidos: number;
  dataPrimeiroVencimento: Date;
  dataProximoVencimento: Date;
  jurosAcumulados: number;
}

export function calcularDetalhamento(diaVencimento: number, dataReferencia: Date, saldoAtual: number, taxaMensal: number, dataAte?: Date): DetalheCobranca {
  const limite = dataAte ? new Date(dataAte) : new Date();
  limite.setHours(23, 59, 59, 999); // Garante incluir o dia inteiro de referência
  
  const ref = new Date(dataReferencia);
  ref.setHours(0, 0, 0, 0);

  // O primeiro vencimento após a referência
  let dataCiclo = new Date(ref.getFullYear(), ref.getMonth(), diaVencimento);
  
  // Se o dia do ciclo for na mesma data ou anterior à referência,
  // ou se o pagamento ocorreu na janela de liquidação do ciclo daquele mês (ex: pagou dia 17 e vence dia 18),
  // o ciclo do mês já foi coberto e o primeiro vencimento real em aberto é no mês seguinte.
  const diffDiasCicloRef = Math.round((dataCiclo.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDiasCicloRef <= 15) {
    dataCiclo.setMonth(dataCiclo.getMonth() + 1);
  }

  const dataPrimeiroVencimento = new Date(dataCiclo);
  let meses = 0;
  let cursor = new Date(dataCiclo);

  // Consideramos atrasado / devido se o vencimento for anterior ou igual ao limite de cálculo
  while (cursor <= limite && saldoAtual > 0) {
    meses++;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    mesesDevidos: meses,
    dataPrimeiroVencimento,
    dataProximoVencimento: cursor,
    jurosAcumulados: Number((saldoAtual * (taxaMensal / 100) * meses).toFixed(2))
  };
}

export function calcularMesesDevidos(diaVencimento: number, dataReferencia: Date): number {
  const det = calcularDetalhamento(diaVencimento, dataReferencia, 1000, 0); // saldo irrelevante para contar meses
  return det.mesesDevidos;
}

export function calcularJurosAcumulados(saldo: number, taxa: number, meses: number): number {
  return Number((saldo * (taxa / 100) * meses).toFixed(2));
}

export function calcularJurosDoPeriodo(saldo: number, taxa: number): number {
  return Number((saldo * (taxa / 100)).toFixed(2));
}
