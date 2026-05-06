import { Devedor } from '../../types';
import { calcularMesesDevidos, calcularDetalhamento } from './juros';

export interface InfoStatus {
  label: string;
  color: string;
  prioridade: number; // Menor é mais importante
  isAtrasado?: boolean;
}

export function getProximoVencimento(devedor: Devedor): Date {
  const diaVenc = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date(devedor.dataCriacao).getDate());
  
  const dataReferencia = devedor.ultimoPagamento 
    ? (devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento))
    : (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate() : new Date());

  const det = calcularDetalhamento(diaVenc, dataReferencia, devedor.saldoDevedorAtual, devedor.taxaJurosMensal);
  
  return det.dataProximoVencimento;
}

export function getDataOrdenacao(devedor: Devedor): number {
  if (devedor.saldoDevedorAtual === 0) return Infinity;

  // Pegamos a data de referência (último pagamento ou criação)
  const dataReferencia = devedor.ultimoPagamento 
    ? (devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento))
    : (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate() : new Date());

  // Quanto mais antiga a referência, mais "atrasado" ou prioritário ele é
  return dataReferencia.getTime();
}

export function getInfoStatus(devedor: Devedor): InfoStatus {
  if (devedor.saldoDevedorAtual === 0) {
    return { label: 'Quitado', color: 'bg-green-100 text-green-700', prioridade: 100 };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeDia = hoje.getDate();
  
  const diaVenc = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date(devedor.dataCriacao).getDate());
  
  const dataReferencia = devedor.ultimoPagamento 
    ? (devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento))
    : (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate() : new Date());

  const detalhe = calcularDetalhamento(diaVenc, dataReferencia, devedor.saldoDevedorAtual, devedor.taxaJurosMensal);
  const mesesDevidos = detalhe.mesesDevidos;
  
  // Se tem meses acumulados, está atrasado indepedente do dia de hoje
  if (mesesDevidos > 0) {
    return { 
      label: mesesDevidos > 1 ? `Atraso (${mesesDevidos}x)` : 'Em Atraso', 
      color: 'bg-red-100 text-red-700', 
      prioridade: 10, 
      isAtrasado: true 
    };
  }

  // Se não tem meses devidos, verificamos se o próximo vencimento é hoje ou amanhã
  const proximoVenc = detalhe.dataPrimeiroVencimento; // Se meses=0, este é o próximo futuro
  const diffDays = Math.ceil((proximoVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'Vence Hoje', color: 'bg-yellow-100 text-yellow-700', prioridade: 20, isAtrasado: false };
  }

  if (diffDays === 1) {
    return { label: 'Vence Amanhã', color: 'bg-blue-100 text-blue-700', prioridade: 30 };
  }

  return { label: 'Em Dia', color: 'bg-giro-primary/10 text-giro-primary', prioridade: 60 };
}
