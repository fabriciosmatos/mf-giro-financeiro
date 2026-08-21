import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Historico, Emprestimo } from '../types';
import { OperationType, handleFirestoreError } from './servicoDevedores';

export const servicoHistorico = {
  async registrarHistorico(devedorId: string, transacao: Omit<Historico, 'id'>) {
    const path = `devedores/${devedorId}/historico`;
    try {
      await addDoc(collection(db, 'devedores', devedorId, 'historico'), {
        ...transacao,
        ownerId: auth.currentUser?.uid,
        criadoPorEmail: auth.currentUser?.email || null,
        criadoPorNome: auth.currentUser?.displayName || auth.currentUser?.email || null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async listarHistorico(devedorId: string): Promise<Historico[]> {
    const path = `devedores/${devedorId}/historico`;
    try {
      if (!auth.currentUser) return [];
      const q = query(
        collection(db, 'devedores', devedorId, 'historico'), 
        orderBy('data', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Historico));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async atualizarHistorico(devedorId: string, historicoId: string, dadosAtualizados: Partial<Historico>) {
    const path = `devedores/${devedorId}/historico/${historicoId}`;
    try {
      const docRef = doc(db, 'devedores', devedorId, 'historico', historicoId);
      await updateDoc(docRef, {
        ...dadosAtualizados,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Sincroniza e recalcula os contratos de empréstimo e o devedor com base em todo o histórico de lançamentos.
   * Garante que data de último pagamento, saldo e status estejam sempre 100% consistentes.
   */
  async sincronizarDevedorEContratos(devedorId: string): Promise<void> {
    const path = `devedores/${devedorId}`;
    try {
      const devedorRef = doc(db, 'devedores', devedorId);
      const historicoRef = collection(db, 'devedores', devedorId, 'historico');
      const emprestimosRef = collection(db, 'devedores', devedorId, 'emprestimos');

      const [historicoSnap, emprestimosSnap, devedorSnap] = await Promise.all([
        getDocs(query(historicoRef, orderBy('data', 'asc'))),
        getDocs(emprestimosRef),
        getDoc(devedorRef)
      ]);

      if (!devedorSnap.exists()) return;

      const historicoList = historicoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Historico));
      const emprestimosList = emprestimosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Emprestimo));

      const ultimoPagamentoPorEmp = new Map<string, Timestamp>();
      const jurosPagosPorEmp = new Map<string, number>();
      const amortizacaoPorEmp = new Map<string, number>();

      let ultimoPagamentoGeral: Timestamp | null = null;
      let totalLucroGeral = 0;

      for (const h of historicoList) {
        if (h.tipo === 'PAGAMENTO') {
          const rawData = h.data;
          const hTimestamp = rawData instanceof Timestamp 
            ? rawData 
            : (rawData && typeof (rawData as any).toDate === 'function' ? Timestamp.fromDate((rawData as any).toDate()) : Timestamp.fromDate(new Date(rawData as any)));
          
          ultimoPagamentoGeral = hTimestamp;
          totalLucroGeral += (h.valorJuros || 0);

          let empIdAlvo = h.emprestimoId;

          // Se não houver empréstimo ID explícito, tenta correlacionar com o dia de vencimento
          if (!empIdAlvo) {
            const dataObj = rawData && typeof (rawData as any).toDate === 'function' ? (rawData as any).toDate() : new Date(rawData as any);
            const diaH = dataObj.getDate();
            const diaVencAlvo = h.diaVencimento || diaH;
            const empMatch = emprestimosList.find(e => e.diaVencimento === diaVencAlvo)
              || emprestimosList.find(e => Math.abs(e.diaVencimento - diaH) <= 2);
            if (empMatch) {
              empIdAlvo = empMatch.id;
            }
          }

          if (empIdAlvo) {
            ultimoPagamentoPorEmp.set(empIdAlvo, hTimestamp);
            jurosPagosPorEmp.set(empIdAlvo, (jurosPagosPorEmp.get(empIdAlvo) || 0) + (h.valorJuros || 0));
            amortizacaoPorEmp.set(empIdAlvo, (amortizacaoPorEmp.get(empIdAlvo) || 0) + (h.valorAmortizado || 0));
          }
        }
      }

      // Atualizar os documentos de empréstimos individuais
      for (const emp of emprestimosList) {
        if (!emp.id) continue;
        const empDocRef = doc(db, 'devedores', devedorId, 'emprestimos', emp.id);
        const ultimoPag = ultimoPagamentoPorEmp.get(emp.id);
        const amort = amortizacaoPorEmp.get(emp.id) || 0;
        const juros = jurosPagosPorEmp.get(emp.id) || 0;
        
        const valorBruto = emp.valorBruto || 0;
        const novoSaldo = Math.max(0, Number((valorBruto - amort).toFixed(2)));
        const novoStatus = novoSaldo === 0 ? 'QUITADO' : 'ATIVO';

        const payload: any = {
          saldoDevedor: novoSaldo,
          status: novoStatus,
          totalLucroGerado: Number(juros.toFixed(2))
        };

        if (ultimoPag) {
          payload.ultimoPagamento = ultimoPag;
        }

        await updateDoc(empDocRef, payload);
      }

      // Atualizar o devedor consolidado
      const totalSaldoRestante = emprestimosList.reduce((acc, emp) => {
        if (!emp.id) return acc;
        const amort = amortizacaoPorEmp.get(emp.id) || 0;
        return acc + Math.max(0, (emp.valorBruto || 0) - amort);
      }, 0);

      const payloadDevedor: any = {
        saldoDevedorAtual: Number(totalSaldoRestante.toFixed(2)),
        totalLucroGerado: Number(totalLucroGeral.toFixed(2))
      };

      if (ultimoPagamentoGeral) {
        payloadDevedor.ultimoPagamento = ultimoPagamentoGeral;
      }

      await updateDoc(devedorRef, payloadDevedor);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};

