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

export type TipoAmortizacao = 'automatico' | 'juros-mensal' | 'apenas-juros' | 'apenas-amortizacao';

/**
 * Função utilitária robusta para extrair Date de qualquer tipo representativo de data.
 */
export function extrairData(campo: any): Date {
  if (!campo) return new Date();
  if (campo instanceof Date) return campo;
  if (typeof campo.toDate === 'function') return campo.toDate();
  if (campo.seconds !== undefined && campo.seconds !== null) {
    return new Date(Number(campo.seconds) * 1000);
  }
  if (campo._seconds !== undefined && campo._seconds !== null) {
    return new Date(Number(campo._seconds) * 1000);
  }
  const dat = new Date(campo);
  if (isNaN(dat.getTime())) {
    return new Date();
  }
  return dat;
}

/**
 * Calcula estimativa acumulada de juros em aberto nos contratos do devedor (ou de um contrato específico).
 */
export function obterJurosEstimadosDevedor(
  devedor: Devedor, 
  emprestimoId?: string, 
  tipoAmortizacao: TipoAmortizacao = 'automatico',
  dataReferenciaPagamento?: Date
): number {
  if (emprestimoId) {
    const emp = (devedor.emprestimos || []).find(e => e.id === emprestimoId);
    if (!emp) return 0;
    const diaVenc = emp.diaVencimento || 1;
    const ref = extrairData(emp.ultimoPagamento || emp.dataInicio);
    const det = calcularDetalhamento(diaVenc, ref, emp.saldoDevedor, emp.taxaJurosMensal, dataReferenciaPagamento);
    
    if (tipoAmortizacao === 'juros-mensal') {
      const mesesGarantidos = Math.max(1, det.mesesDevidos);
      return Number((emp.saldoDevedor * (emp.taxaJurosMensal / 100) * mesesGarantidos).toFixed(2));
    } else if (tipoAmortizacao === 'apenas-amortizacao') {
      return 0;
    }
    
    return Number(det.jurosAcumulados.toFixed(2));
  }
  
  const emps = devedor.emprestimos || [];
  const sum = emps
    .filter(e => e.status === 'ATIVO')
    .reduce((acc, e) => {
      const diaVenc = e.diaVencimento || 1;
      const ref = extrairData(e.ultimoPagamento || e.dataInicio);
      const det = calcularDetalhamento(diaVenc, ref, e.saldoDevedor, e.taxaJurosMensal, dataReferenciaPagamento);
      
      if (tipoAmortizacao === 'juros-mensal') {
        const mesesGarantidos = Math.max(1, det.mesesDevidos);
        return acc + (e.saldoDevedor * (e.taxaJurosMensal / 100) * mesesGarantidos);
      } else if (tipoAmortizacao === 'apenas-amortizacao') {
        return acc;
      }
      
      return acc + det.jurosAcumulados;
    }, 0);
  return Number(sum.toFixed(2));
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
  emprestimoIdAlvo?: string,
  tipoAmortizacao: TipoAmortizacao = 'automatico',
  dataReferenciaPagamento?: Date
): ResultadoDecomposicaoGeral {
  const emprestimos = devedor.emprestimos || [];
  let ativos = [...emprestimos].filter(e => e.status === 'ATIVO');

  if (emprestimoIdAlvo) {
    ativos = ativos.filter(e => e.id === emprestimoIdAlvo);
  } else {
    // Ordenado por dataInicio (mais antigos primeiro para amortização justa)
    ativos.sort((a, b) => {
      const dateA = extrairData(a.dataInicio).getTime();
      const dateB = extrairData(b.dataInicio).getTime();
      return dateA - dateB;
    });
  }

  let saldoDisponivel = valorPago;
  const detalhePorEmprestimo: DetalheAlocacaoEmprestimo[] = [];

  // 1. Passo Opcional de Preparação: Calcular os juros devidos e saldo de cada contrato ativo
  const contratosMetricas = ativos.map(e => {
    const diaVenc = e.diaVencimento || 1;
    const ref = extrairData(e.ultimoPagamento || e.dataInicio);
    
    // Obter juros devidos calculados
    const det = calcularDetalhamento(diaVenc, ref, e.saldoDevedor, e.taxaJurosMensal, dataReferenciaPagamento);
    
    let jurosDevidosCalculados = det.jurosAcumulados;
    
    if (tipoAmortizacao === 'juros-mensal') {
      const mesesGarantidos = Math.max(1, det.mesesDevidos);
      jurosDevidosCalculados = Number((e.saldoDevedor * (e.taxaJurosMensal / 100) * mesesGarantidos).toFixed(2));
    } else if (tipoAmortizacao === 'apenas-juros') {
      // Como é apenas juros, podemos cobrar de juros até o limite do saldoDisponivel para o total
      jurosDevidosCalculados = valorPago; 
    } else if (tipoAmortizacao === 'apenas-amortizacao') {
      jurosDevidosCalculados = 0;
    }

    return {
      e,
      jurosDevidos: jurosDevidosCalculados,
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
    let amortizado = 0;
    
    if (tipoAmortizacao === 'apenas-juros') {
      amortizado = 0;
    } else {
      amortizado = Math.min(saldoDisponivel, principalDevido);
      saldoDisponivel -= amortizado;
    }

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
