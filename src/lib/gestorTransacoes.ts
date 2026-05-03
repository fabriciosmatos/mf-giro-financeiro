import { Devedor, Historico } from '../types';
import { servicoDados } from '../services/servicoDados';
import { serverTimestamp } from 'firebase/firestore';
import { calcularResultadoPagamento } from './financeiro/transacaoLogic';
import { simularNovoSaldo } from './financeiro/amortizacao';

/**
 * Orquestrador de fluxo para pagamentos e aportes.
 */

export interface TransacaoInput {
  valor: number;
  observacao?: string;
  data?: string; // Formato YYYY-MM-DD
}

export const gestorTransacoes = {
  async processarPagamento(devedor: Devedor, transacaoInput: TransacaoInput) {
    const { valor, observacao, data } = transacaoInput;
    
    const { novoSaldo, jurosPagos, amortizacao, lucroAcumulado } = calcularResultadoPagamento(devedor, valor);

    const timestamp = data ? new Date(data + 'T12:00:00') : serverTimestamp();

    const transacao: Omit<Historico, 'id'> = {
      data: timestamp,
      tipo: 'PAGAMENTO',
      valorTotal: valor,
      valorJuros: jurosPagos,
      valorAmortizado: amortizacao,
      saldoRestante: novoSaldo,
      observacao: observacao || '',
    };

    await servicoDados.registrarHistorico(devedor.id!, transacao);
    await servicoDados.atualizarDevedor(devedor.id!, {
      saldoDevedorAtual: novoSaldo,
      totalLucroGerado: lucroAcumulado as any,
      ultimoPagamento: timestamp
    });
  },

  async processarAporte(devedor: Devedor, transacaoInput: TransacaoInput) {
    const { valor, observacao, data } = transacaoInput;
    const novoSaldo = simularNovoSaldo(devedor.saldoDevedorAtual, valor, 'APORTE');

    const timestamp = data ? new Date(data + 'T12:00:00') : serverTimestamp();

    const transacao: Omit<Historico, 'id'> = {
      data: timestamp,
      tipo: 'APORTE',
      valorTotal: valor,
      valorJuros: 0,
      valorAmortizado: 0,
      saldoRestante: novoSaldo,
      observacao: observacao || '',
    };

    await servicoDados.registrarHistorico(devedor.id!, transacao);
    await servicoDados.atualizarDevedor(devedor.id!, {
      saldoDevedorAtual: novoSaldo
    });
  }
};
