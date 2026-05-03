import { Devedor } from '../../types';

export interface InfoStatus {
  label: string;
  color: string;
  prioridade: number; // Menor é mais importante
  isAtrasado?: boolean;
}

export function getProximoVencimento(devedor: Devedor): Date {
  const hoje = new Date();
  const diaVenc = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date(devedor.dataCriacao).getDate());
  
  let proximo = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
  
  let pagoEsteMes = false;
  if (devedor.ultimoPagamento) {
    const dataPagto = devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento);
    if (dataPagto.getMonth() === hoje.getMonth() && dataPagto.getFullYear() === hoje.getFullYear()) {
      pagoEsteMes = true;
    }
  }

  // Se o dia de vencimento já passou este mês OU se já pagou este mês
  if (hoje.getDate() > diaVenc || pagoEsteMes) {
    proximo.setMonth(proximo.getMonth() + 1);
  }
  
  return proximo;
}

export function getDataOrdenacao(devedor: Devedor): number {
  if (devedor.saldoDevedorAtual === 0) return Infinity;

  const info = getInfoStatus(devedor);
  const hoje = new Date();
  const diaVenc = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date(devedor.dataCriacao).getDate());

  if (info.isAtrasado || info.label === 'Vence Hoje') {
    // Para atrasados ou vence hoje, usamos a data do vencimento que passou ou atual
    // Isso garante que fiquem no topo (datas menores/mais antigas)
    const hojeDia = hoje.getDate();
    let dataReferencia = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
    
    // Se hoje é dia 1-5 e o vencimento é 20-31, o atraso é do mês anterior
    if (hojeDia <= 5 && diaVenc > 20 && info.isAtrasado) {
      dataReferencia.setMonth(dataReferencia.getMonth() - 1);
    }
    return dataReferencia.getTime();
  }

  // Para os demais, usamos a próxima data de vencimento
  return getProximoVencimento(devedor).getTime();
}

export function getInfoStatus(devedor: Devedor): InfoStatus {
  if (devedor.saldoDevedorAtual === 0) {
    return { label: 'Quitado', color: 'bg-green-100 text-green-700', prioridade: 100 };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeDia = hoje.getDate();
  
  const diaVenc = devedor.diaVencimento || (devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate().getDate() : new Date(devedor.dataCriacao).getDate());
  
  const dataCriacao = devedor.dataCriacao?.toDate ? devedor.dataCriacao.toDate() : new Date(devedor.dataCriacao);
  const isCriadoEsteMes = dataCriacao.getMonth() === hoje.getMonth() && dataCriacao.getFullYear() === hoje.getFullYear();

  let pagoEsteMes = false;
  if (devedor.ultimoPagamento) {
    const dataPagto = devedor.ultimoPagamento.toDate ? devedor.ultimoPagamento.toDate() : new Date(devedor.ultimoPagamento);
    if (dataPagto.getMonth() === hoje.getMonth() && dataPagto.getFullYear() === hoje.getFullYear()) {
      pagoEsteMes = true;
    }
  }

  // LOGS PARA ANÁLISE
  console.log(`[StatusLogic] Devedor: ${devedor.nomeCompleto}`);
  console.log(`- Dia Venc: ${diaVenc} | Hoje Dia: ${hojeDia}`);
  console.log(`- Pago este mês: ${pagoEsteMes} | Criado este mês: ${isCriadoEsteMes}`);

  if (pagoEsteMes) {
    return { label: 'Em Dia', color: 'bg-giro-primary/10 text-giro-primary', prioridade: 60 };
  }

  // Prioridade 1: Atrasados (Dia de vencimento já passou)
  const isCedoNoMes = hojeDia <= 5;
  const isVencimentoFinalMes = diaVenc > 20;

  if (diaVenc < hojeDia || (isCedoNoMes && isVencimentoFinalMes)) {
    console.log(`- Detectado Atraso: ${diaVenc < hojeDia ? 'Dia passou' : 'Venc. mês passado'}`);
    return { label: 'Em Atraso', color: 'bg-red-100 text-red-700', prioridade: 10, isAtrasado: true };
  }

  // Prioridade 2: Vence Hoje (Mantemos isAtrasado false para aparecer em "Em Dia")
  if (diaVenc === hojeDia) {
    return { label: 'Vence Hoje', color: 'bg-yellow-100 text-yellow-700', prioridade: 20, isAtrasado: false };
  }

  // Prioridade 3: Vence Amanhã
  if (diaVenc === hojeDia + 1) {
    return { label: 'Vence Amanhã', color: 'bg-blue-100 text-blue-700', prioridade: 30 };
  }

  return { label: 'Em Dia', color: 'bg-giro-primary/10 text-giro-primary', prioridade: 60 };
}
