import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Emprestimo } from '../types';
import { OperationType, handleFirestoreError } from './servicoDevedores';

export const servicoEmprestimos = {
  async criarEmprestimo(devedorId: string, emprestimo: Omit<Emprestimo, 'id'>): Promise<string> {
    const path = `devedores/${devedorId}/emprestimos`;
    try {
      const docRef = await addDoc(collection(db, 'devedores', devedorId, 'emprestimos'), {
        ...emprestimo,
        ownerId: auth.currentUser?.uid,
        dataInicio: emprestimo.dataInicio instanceof Date 
          ? Timestamp.fromDate(emprestimo.dataInicio) 
          : emprestimo.dataInicio,
        dataVencimento: emprestimo.dataVencimento instanceof Date 
          ? Timestamp.fromDate(emprestimo.dataVencimento) 
          : (emprestimo.dataVencimento || null),
        ultimoPagamento: emprestimo.ultimoPagamento instanceof Date 
          ? Timestamp.fromDate(emprestimo.ultimoPagamento) 
          : (emprestimo.ultimoPagamento || null)
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async listarEmprestimos(devedorId: string): Promise<Emprestimo[]> {
    const path = `devedores/${devedorId}/emprestimos`;
    try {
      if (!auth.currentUser) return [];
      const q = query(
        collection(db, 'devedores', devedorId, 'emprestimos'),
        orderBy('dataInicio', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert timestamp fields safely if UI expects Dates
        } as Emprestimo;
      });
    } catch (error) {
      console.error(`Erro ao listar emprestimos para devedor ${devedorId}:`, error);
      // Retorna vazio em vez de crashar, para lidar com devedores antigos sem a subcoleção
      return [];
    }
  },

  async atualizarEmprestimo(devedorId: string, emprestimoId: string, dados: Partial<Emprestimo>) {
    const path = `devedores/${devedorId}/emprestimos/${emprestimoId}`;
    try {
      const docRef = doc(db, 'devedores', devedorId, 'emprestimos', emprestimoId);
      const payload: any = { ...dados };
      
      if (dados.dataInicio instanceof Date) {
        payload.dataInicio = Timestamp.fromDate(dados.dataInicio);
      }
      if (dados.dataVencimento instanceof Date) {
        payload.dataVencimento = Timestamp.fromDate(dados.dataVencimento);
      }
      if (dados.ultimoPagamento instanceof Date) {
        payload.ultimoPagamento = Timestamp.fromDate(dados.ultimoPagamento);
      }

      await updateDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
