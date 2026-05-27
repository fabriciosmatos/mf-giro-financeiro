import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Carteira } from '../types';
import { OperationType, handleFirestoreError } from './servicoDevedores';

export const servicoCarteiras = {
  async criarCarteira(nome: string): Promise<string> {
    const path = 'carteiras';
    try {
      const docRef = await addDoc(collection(db, path), {
        nome,
        ownerId: auth.currentUser?.uid,
        ownerEmail: auth.currentUser?.email || null,
        emailsCompartilhados: [],
        dataCriacao: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async listarCarteiras(): Promise<Carteira[]> {
    const path = 'carteiras';
    try {
      if (!auth.currentUser) return [];
      
      // 1. Listar próprias parceiras
      const qProprias = query(
        collection(db, path),
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('dataCriacao', 'asc')
      );
      const snapshotProprias = await getDocs(qProprias);
      const carteirasProprias = snapshotProprias.docs.map(doc => ({ id: doc.id, ...doc.data() } as Carteira));

      // 2. Listar carteiras compartilhadas com o próprio e-mail
      let carteirasCompartilhadas: Carteira[] = [];
      if (auth.currentUser.email) {
        const qCompartilhadas = query(
          collection(db, path),
          where('emailsCompartilhados', 'array-contains', auth.currentUser.email)
        );
        const snapshotCompartilhadas = await getDocs(qCompartilhadas);
        carteirasCompartilhadas = snapshotCompartilhadas.docs.map(doc => ({ id: doc.id, ...doc.data() } as Carteira));
      }

      // Mesclar e remover duplicados por ID
      const mapa = new Map<string, Carteira>();
      carteirasProprias.forEach(c => mapa.set(c.id, c));
      carteirasCompartilhadas.forEach(c => mapa.set(c.id, c));

      return Array.from(mapa.values());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async excluirCarteira(id: string): Promise<void> {
    const path = `carteiras/${id}`;
    try {
      const docRef = doc(db, 'carteiras', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async compartilharCarteira(id: string, email: string): Promise<void> {
    const path = `carteiras/${id}`;
    try {
      const docRef = doc(db, 'carteiras', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const dados = snapshot.data();
        const emails: string[] = dados.emailsCompartilhados || [];
        const emailAlvo = email.trim().toLowerCase();
        if (emailAlvo && !emails.includes(emailAlvo)) {
          emails.push(emailAlvo);
          await updateDoc(docRef, { emailsCompartilhados: emails });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async removerCompartilhamentoCarteira(id: string, email: string): Promise<void> {
    const path = `carteiras/${id}`;
    try {
      const docRef = doc(db, 'carteiras', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const dados = snapshot.data();
        const emails: string[] = dados.emailsCompartilhados || [];
        const emailAlvo = email.trim().toLowerCase();
        const filtrados = emails.filter(e => e !== emailAlvo);
        await updateDoc(docRef, { emailsCompartilhados: filtrados });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
