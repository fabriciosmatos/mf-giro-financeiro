import { Devedor, Emprestimo } from '../../types';
import { calcularMesesDevidos, calcularDetalhamento } from './juros';

export interface InfoStatus {
  label: string;
  color: string;
  prioridade: number; // Menor é mais importante
  isAtrasado?: boolean;
}

const extrairData = (campo: any): Date => {
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
};

export function obterDadosFiscaisConsolidados(devedor: Devedor) {
  const emprestimos = devedor.emprestimos || [];
  const ativos = emprestimos.filter(e => e.status === 'ATIVO');

  if (ativos.length === 0) {
    const temEmprestimos = devedor.emprestimos && devedor.emprestimos.length > 0;
    return {
      saldoDevedorAtual: temEmprestimos ? 0 : devedor.saldoDevedorAtual,
      jurosMensalSimples: temEmprestimos ? 0 : (devedor.saldoDevedorAtual * (devedor.taxaJurosMensal / 100)),
      jurosAcumulados: 0,
      mesesDevidos: 0,
      dataProximoVencimento: new Date(),
      dataPrimeiroVencimento: new Date()
    };
  }

  let totalSaldoDevedor = 0;
  let totalJurosAcumulados = 0;
  let maxMesesDevidos = 0;
  let totalJurosMensalSimples = 0;
  let proximoVencimentoGeral: Date | null = null;
  let atrasadoDesdeGeral: Date | null = null;

  ativos.forEach(e => {
    totalSaldoDevedor += e.saldoDevedor;
    totalJurosMensalSimples += Number((e.saldoDevedor * (e.taxaJurosMensal / 100)).toFixed(2));
    
    const diaVenc = e.diaVencimento || 1;
    const ref = extrairData(e.ultimoPagamento || e.dataInicio);
      
    const det = calcularDetalhamento(diaVenc, ref, e.saldoDevedor, e.taxaJurosMensal);
    totalJurosAcumulados += det.jurosAcumulados;
    
    if (det.mesesDevidos > maxMesesDevidos) {
      maxMesesDevidos = det.mesesDevidos;
      atrasadoDesdeGeral = det.dataPrimeiroVencimento;
    }
    
    const vencimentoloan = det.dataProximoVencimento;
    if (!proximoVencimentoGeral || vencimentoloan < proximoVencimentoGeral) {
      proximoVencimentoGeral = vencimentoloan;
    }
  });

  return {
    saldoDevedorAtual: totalSaldoDevedor,
    jurosMensalSimples: totalJurosMensalSimples,
    jurosAcumulados: totalJurosAcumulados,
    mesesDevidos: maxMesesDevidos,
    dataProximoVencimento: proximoVencimentoGeral || new Date(),
    dataPrimeiroVencimento: atrasadoDesdeGeral || proximoVencimentoGeral || new Date()
  };
}

export function getProximoVencimento(devedor: Devedor): Date {
  const consol = obterDadosFiscaisConsolidados(devedor);
  return consol.dataProximoVencimento;
}

export function getDataOrdenacao(devedor: Devedor): number {
  const consol = obterDadosFiscaisConsolidados(devedor);
  if (consol.saldoDevedorAtual === 0) return Infinity;

  const emprestimos = devedor.emprestimos || [];
  const ativos = emprestimos.filter(e => e.status === 'ATIVO');
  if (ativos.length > 0) {
    let minTime = Infinity;
    ativos.forEach(e => {
      const ref = extrairData(e.ultimoPagamento || e.dataInicio);
      if (ref.getTime() < minTime) {
        minTime = ref.getTime();
      }
    });
    return minTime;
  }

  const dataReferencia = devedor.ultimoPagamento 
    ? extrairData(devedor.ultimoPagamento)
    : extrairData(devedor.dataCriacao);

  return dataReferencia.getTime();
}

export function getInfoStatus(devedor: Devedor): InfoStatus {
  const consol = obterDadosFiscaisConsolidados(devedor);
  const temEmprestimos = devedor.emprestimos && devedor.emprestimos.length > 0;

  if (!temEmprestimos) {
    return { label: 'Sem Contratos', color: 'bg-gray-100 text-gray-600', prioridade: 60 };
  }

  if (consol.saldoDevedorAtual === 0) {
    return { label: 'Quitado', color: 'bg-green-100 text-green-700', prioridade: 100 };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const mesesDevidos = consol.mesesDevidos;
  if (mesesDevidos > 0) {
    return { 
      label: mesesDevidos > 1 ? `Atraso (${mesesDevidos}x)` : 'Em Atraso', 
      color: 'bg-red-100 text-red-700', 
      prioridade: 10, 
      isAtrasado: true 
    };
  }

  const proximoVenc = consol.dataProximoVencimento;
  const diffDays = Math.ceil((proximoVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'Vence Hoje', color: 'bg-yellow-100 text-yellow-700', prioridade: 20, isAtrasado: false };
  }

  if (diffDays === 1) {
    return { label: 'Vence Amanhã', color: 'bg-blue-100 text-blue-700', prioridade: 30 };
  }

  return { label: 'Em Dia', color: 'bg-giro-primary/10 text-giro-primary', prioridade: 60 };
}
