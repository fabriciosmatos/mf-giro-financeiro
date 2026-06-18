/**
 * Operações persistentes e transações atômicas com o Banco de Dados (Firestore).
 * Rigorosamente em português.
 */

import { 
  doc, 
  collection, 
  runTransaction, 
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Devedor, Historico, Emprestimo } from '../../types';
import { decomporPagamentoMulticontrato, TipoAmortizacao } from './FormularioTransacao.financeiro';

export const FormularioTransacaoBanco = {
  /**
   * Registra um novo empréstimo (antigo aporte) de forma atômica no Firestore.
   */
  async criarNovoEmprestimoNoBanco(
    devedor: Devedor,
    valor: number,
    taxaPercentual: number,
    diaVenc: number,
    dataInicioString: string,
    observacao: string
  ): Promise<void> {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');
    if (!devedor.id) throw new Error('ID do devedor inválido');

    const devedorRef = doc(db, 'devedores', devedor.id);
    const emprestimosColRef = collection(db, 'devedores', devedor.id, 'emprestimos');
    const historicoColRef = collection(db, 'devedores', devedor.id, 'historico');

    const dataInicioDate = new Date(dataInicioString + 'T12:00:00');
    const timestampInicio = Timestamp.fromDate(dataInicioDate);

    await runTransaction(db, async (transacao) => {
      // 1. Obter o dado atualizado do Devedor para consistência
      const devedorSnapshot = await transacao.get(devedorRef);
      if (!devedorSnapshot.exists()) {
        throw new Error('Devedor não encontrado');
      }
      const devedorDocData = devedorSnapshot.data();
      const saldoDevedorAtualAnterior = devedorDocData.saldoDevedorAtual || 0;

      // 2. Criar uma nova referência de documento de empréstimo dentro do lote
      const novoEmprestimoDocRef = doc(emprestimosColRef);
      const novoEmprestimoPayload = {
        valorBruto: valor,
        saldoDevedor: valor,
        taxaJurosMensal: taxaPercentual,
        diaVencimento: diaVenc,
        dataInicio: timestampInicio,
        status: 'ATIVO',
        origem: 'Aporte de Capital',
        observacao: observacao || null,
        ultimoPagamento: null,
        totalLucroGerado: 0,
        ownerId: auth.currentUser?.uid,
      };

      transacao.set(novoEmprestimoDocRef, novoEmprestimoPayload);

      // 3. Atualizar o saldo devedor principal consolidado do devedor
      const novoSaldoDevedorAtual = Number((saldoDevedorAtualAnterior + valor).toFixed(2));
      transacao.update(devedorRef, {
        saldoDevedorAtual: novoSaldoDevedorAtual,
        // Mantemos taxas de fallback compatíveis
        taxaJurosMensal: taxaPercentual,
        diaVencimento: diaVenc,
        ultimaAlteracaoPorEmail: auth.currentUser?.email || null,
        ultimaAlteracaoPorNome: auth.currentUser?.displayName || auth.currentUser?.email || null,
        ultimaAlteracaoData: Timestamp.now()
      });

      // 4. Registrar a entrada no histórico de transações
      const novoHistoricoDocRef = doc(historicoColRef);
      const historicoPayload = {
        data: timestampInicio,
        tipo: 'APORTE',
        valorTotal: valor,
        saldoRestante: novoSaldoDevedorAtual,
        valorJuros: 0,
        valorAmortizado: 0,
        observacao: observacao || 'Aporte/Empréstimo concedido',
        ownerId: auth.currentUser?.uid,
        criadoPorEmail: auth.currentUser?.email || null,
        criadoPorNome: auth.currentUser?.displayName || auth.currentUser?.email || null,
        emprestimoId: novoEmprestimoDocRef.id,
      };

      transacao.set(novoHistoricoDocRef, historicoPayload);
    });
  },

  /**
   * Recebe e distribui o pagamento proporcionalmente entre os contratos ativos usando runTransaction.
   */
  async registrarPagamentoNoBanco(
    devedor: Devedor,
    valorPago: number,
    dataPagamentoString: string,
    observacao: string,
    emprestimoIdAlvo?: string,
    tipoAmortizacao: TipoAmortizacao = 'automatico'
  ): Promise<void> {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');
    if (!devedor.id) throw new Error('ID do devedor inválido');

    const dataRefObj = dataPagamentoString ? new Date(dataPagamentoString + 'T12:00:00') : undefined;

    // 1. Calcular a alocação do pagamento de forma pura usando a engine financeira
    const resultadoAlocacao = decomporPagamentoMulticontrato(valorPago, devedor, emprestimoIdAlvo, tipoAmortizacao, dataRefObj);

    const devedorRef = doc(db, 'devedores', devedor.id);
    const historicoColRef = collection(db, 'devedores', devedor.id, 'historico');
    const dataPagamentoDate = new Date(dataPagamentoString + 'T12:00:00');
    const timestampPagamento = Timestamp.fromDate(dataPagamentoDate);

    await runTransaction(db, async (transacao) => {
      // 2. Buscar o Devedor atualizado
      const devedorSnapshot = await transacao.get(devedorRef);
      if (!devedorSnapshot.exists()) {
        throw new Error('Devedor não encontrado');
      }
      const devedorDocData = devedorSnapshot.data();
      const saldoDevedorAtualAnterior = devedorDocData.saldoDevedorAtual || 0;
      const totalLucroGeradoAnterior = devedorDocData.totalLucroGerado || 0;

      // 3. Atualizar cada contrato/empréstimo de acordo com a decomposição financeira calculated
      for (const aloc of resultadoAlocacao.detalhePorEmprestimo) {
        const empDocRef = doc(db, 'devedores', devedor.id!, 'emprestimos', aloc.emprestimoId);
        
        // Carregar o estado atual do empréstimo para atualizar incrementalmente
        const empSnapshot = await transacao.get(empDocRef);
        if (!empSnapshot.exists()) {
          throw new Error(`Contrato de empréstimo ${aloc.emprestimoId} não cadastrado`);
        }
        
        const empData = empSnapshot.data();
        const jurosLucroAnterior = empData.totalLucroGerado || 0;

        const payloadAtualizacaoEmprestimo: any = {
          saldoDevedor: aloc.saldoDevedorRestante,
          status: aloc.quitado ? 'QUITADO' : 'ATIVO',
        };

        if (aloc.jurosPagos > 0) {
          payloadAtualizacaoEmprestimo.ultimoPagamento = timestampPagamento;
          payloadAtualizacaoEmprestimo.totalLucroGerado = Number((jurosLucroAnterior + aloc.jurosPagos).toFixed(2));
        }

        transacao.update(empDocRef, payloadAtualizacaoEmprestimo);
      }

      // 4. Calcular consolidados para atualizar o Devedor
      const novoSaldoDevedorAtual = Math.max(0, Number((saldoDevedorAtualAnterior - resultadoAlocacao.amortizacaoPaga).toFixed(2)));
      const novoTotalLucroGerado = Number((totalLucroGeradoAnterior + resultadoAlocacao.jurosPagos).toFixed(2));

      transacao.update(devedorRef, {
        saldoDevedorAtual: novoSaldoDevedorAtual,
        totalLucroGerado: novoTotalLucroGerado,
        ultimoPagamento: timestampPagamento,
        ultimaAlteracaoPorEmail: auth.currentUser?.email || null,
        ultimaAlteracaoPorNome: auth.currentUser?.displayName || auth.currentUser?.email || null,
        ultimaAlteracaoData: Timestamp.now()
      });

      // 5. Escrever a linha centralizada de histórico de transação
      const novoHistoricoDocRef = doc(historicoColRef);
      const historicoPayload = {
        data: timestampPagamento,
        tipo: 'PAGAMENTO',
        valorTotal: valorPago,
        saldoRestante: novoSaldoDevedorAtual,
        valorJuros: resultadoAlocacao.jurosPagos,
        valorAmortizado: resultadoAlocacao.amortizacaoPaga,
        observacao: observacao || `Recebimento amortizado (Juros: R$ ${resultadoAlocacao.jurosPagos} | Amort.: R$ ${resultadoAlocacao.amortizacaoPaga})`,
        ownerId: auth.currentUser?.uid,
        criadoPorEmail: auth.currentUser?.email || null,
        criadoPorNome: auth.currentUser?.displayName || auth.currentUser?.email || null,
      };

      transacao.set(novoHistoricoDocRef, historicoPayload);
    });
  }
};
