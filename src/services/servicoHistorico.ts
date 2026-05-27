import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Historico } from '../types';
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
  }
};
