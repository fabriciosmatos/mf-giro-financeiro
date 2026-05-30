/**
 * Regras financeiras puras para amortização e composição de pagamentos agrupados.
 * Rigorosamente em português.
 */

import { Devedor, Emprestimo } from '../../types';
import { obterDadosFiscaisConsolidados } from '../../lib/financeiro/statusLogic';
import { calcularDetalhamento } from '../../lib/financeiro/juros';

export interface DetalheAlocacaoEmprestimo {
  emprestimoId: string;
  valorBrutoAnterior: number;
  saldoDevedorAnterior: number;
  jurosDevidos: number;
  jurosPagos: number;
  amortizado: number;
  saldoDevedorRestante: number;
  quitado: boolean;
}

export interface ResultadoDecomposicaoGeral {
  jurosPagos: number;
  amortizacaoPaga: number;
  detalhePorEmprestimo: DetalheAlocacaoEmprestimo[];
}

/**
 * Calcula estimativa acumulada de juros em aberto nos contratos do devedor (ou de um contrato específico).
 */
export function obterJurosEstimadosDevedor(devedor: Devedor, emprestimoId?: string): number {
  if (emprestimoId) {
    const emp = (devedor.emprestimos || []).find(e => e.id === emprestimoId);
    if (!emp) return 0;
    const diaVenc = emp.diaVencimento || 1;
    const ref = emp.ultimoPagamento 
      ? (emp.ultimoPagamento.toDate ? emp.ultimoPagamento.toDate() : new Date(emp.ultimoPagamento))
      : (emp.dataInicio.toDate ? emp.dataInicio.toDate() : new Date(emp.dataInicio));
    const det = calcularDetalhamento(diaVenc, ref, emp.saldoDevedor, emp.taxaJurosMensal);
    return Number(det.jurosAcumulados.toFixed(2));
  }
  const consol = obterDadosFiscaisConsolidados(devedor);
  return Number(consol.jurosAcumulados.toFixed(2));
}

/**
 * Decompõe o pagamento recebido de forma justa.
 * Se houver um contrato específico selecionado, abate exclusivamente dele.
 * Senão, divide entre todos.
 * REGRA: "Juros pagos primeiro, o que sobrar abate o principal."
 */
export function decomporPagamentoMulticontrato(
  valorPago: number,
  devedor: Devedor,
  emprestimoIdAlvo?: string
): ResultadoDecomposicaoGeral {
  const emprestimos = devedor.emprestimos || [];
  let ativos = [...emprestimos].filter(e => e.status === 'ATIVO');

  if (emprestimoIdAlvo) {
    ativos = ativos.filter(e => e.id === emprestimoIdAlvo);
  } else {
    // Ordenado por dataInicio (mais antigos primeiro para amortização justa)
    ativos.sort((a, b) => {
      const dateA = a.dataInicio?.seconds || new Date(a.dataInicio).getTime();
      const dateB = b.dataInicio?.seconds || new Date(b.dataInicio).getTime();
      return dateA - dateB;
    });
  }

  let saldoDisponivel = valorPago;
  const detalhePorEmprestimo: DetalheAlocacaoEmprestimo[] = [];

  // 1. Passo Opcional de Preparação: Calcular os juros devidos e saldo de cada contrato ativo
  const contratosMetricas = ativos.map(e => {
    const diaVenc = e.diaVencimento || 1;
    const ref = e.ultimoPagamento 
      ? (e.ultimoPagamento.toDate ? e.ultimoPagamento.toDate() : new Date(e.ultimoPagamento))
      : (e.dataInicio.toDate ? e.dataInicio.toDate() : new Date(e.dataInicio));
    
    // Obter juros devidos calculados
    const det = calcularDetalhamento(diaVenc, ref, e.saldoDevedor, e.taxaJurosMensal);
    return {
      e,
      jurosDevidos: det.jurosAcumulados,
    };
  });

  // 2. Cobrar os JUROS de cada contrato ativo primeiro
  const jurosPagosMapeados = new Map<string, number>();
  contratosMetricas.forEach(item => {
    const jDevido = item.jurosDevidos;
    const jPago = Math.min(saldoDisponivel, jDevido);
    saldoDisponivel -= jPago;
    jurosPagosMapeados.set(item.e.id!, jPago);
  });

  // 3. Abater o PRINCIPAL (Amortização) com o que sobrou em caixa
  contratosMetricas.forEach(item => {
    const e = item.e;
    const jPago = jurosPagosMapeados.get(e.id!) || 0;
    
    const principalDevido = e.saldoDevedor;
    const amortizado = Math.min(saldoDisponivel, principalDevido);
    saldoDisponivel -= amortizado;

    const saldoDevedorRestante = Number((principalDevido - amortizado).toFixed(2));
    const quitado = saldoDevedorRestante <= 0;

    detalhePorEmprestimo.push({
      emprestimoId: e.id!,
      valorBrutoAnterior: e.valorBruto,
      saldoDevedorAnterior: e.saldoDevedor,
      jurosDevidos: item.jurosDevidos,
      jurosPagos: Number(jPago.toFixed(2)),
      amortizado: Number(amortizado.toFixed(2)),
      saldoDevedorRestante,
      quitado,
    });
  });

  // Totais consolidados
  const totalJurosPagos = detalhePorEmprestimo.reduce((acc, current) => acc + current.jurosPagos, 0);
  const totalPrincipalAmortizado = detalhePorEmprestimo.reduce((acc, current) => acc + current.amortizado, 0);

  return {
    jurosPagos: Number(totalJurosPagos.toFixed(2)),
    amortizacaoPaga: Number(totalPrincipalAmortizado.toFixed(2)),
    detalhePorEmprestimo,
  };
}
