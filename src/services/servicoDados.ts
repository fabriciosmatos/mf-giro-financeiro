import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Devedor, Historico } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const servicoDados = {
  async criarDevedor(devedor: Omit<Devedor, 'id' | 'dataCriacao' | 'totalLucroGerado'> & { dataCriacao?: Date }): Promise<string> {
    const path = 'devedores';
    try {
      const timestampCriacao = devedor.dataCriacao || new Date();
      const docRef = await addDoc(collection(db, path), {
        ...devedor,
        ownerId: auth.currentUser?.uid,
        totalLucroGerado: 0,
        dataCriacao: Timestamp.fromDate(timestampCriacao),
        diaVencimento: devedor.diaVencimento || timestampCriacao.getDate(),
      });

      // Registrar transação inicial representativa do capital de giro
      if (devedor.saldoDevedorAtual > 0) {
        await addDoc(collection(db, 'devedores', docRef.id, 'historico'), {
          data: Timestamp.fromDate(timestampCriacao),
          tipo: 'APORTE',
          valorTotal: devedor.saldoDevedorAtual,
          valorJuros: 0,
          valorAmortizado: 0,
          saldoRestante: devedor.saldoDevedorAtual,
          observacao: 'Capital inicial do cadastro',
          ownerId: auth.currentUser?.uid
        });
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async listarDevedores(): Promise<Devedor[]> {
    const path = 'devedores';
    try {
      if (!auth.currentUser) return [];
      const q = query(
        collection(db, path), 
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('nomeCompleto', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Devedor));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async buscarDevedor(id: string): Promise<Devedor | null> {
    const path = `devedores/${id}`;
    try {
      const docRef = doc(db, 'devedores', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Devedor;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async atualizarDevedor(id: string, dados: Partial<Devedor>) {
    const path = `devedores/${id}`;
    try {
      const docRef = doc(db, 'devedores', id);
      await updateDoc(docRef, dados);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async registrarHistorico(devedorId: string, transacao: Omit<Historico, 'id'>) {
    const path = `devedores/${devedorId}/historico`;
    try {
      await addDoc(collection(db, 'devedores', devedorId, 'historico'), {
        ...transacao,
        ownerId: auth.currentUser?.uid
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
        where('ownerId', '==', auth.currentUser.uid),
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
