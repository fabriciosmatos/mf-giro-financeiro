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
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Devedor } from '../types';
import { servicoCarteiras } from './servicoCarteiras';
import { servicoEmprestimos } from './servicoEmprestimos';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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

export const servicoDevedores = {
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
        criadoPorEmail: auth.currentUser?.email || null,
        criadoPorNome: auth.currentUser?.displayName || auth.currentUser?.email || null,
      });

      // Registrar transação inicial representativa do capital de giro e criar contrato isolado correspondente
      if (devedor.saldoDevedorAtual > 0) {
        // Criar o contrato de empréstimo isolado
        const empRef = await addDoc(collection(db, 'devedores', docRef.id, 'emprestimos'), {
          valorBruto: devedor.saldoDevedorAtual,
          saldoDevedor: devedor.saldoDevedorAtual,
          taxaJurosMensal: devedor.taxaJurosMensal,
          diaVencimento: devedor.diaVencimento || timestampCriacao.getDate(),
          dataInicio: Timestamp.fromDate(timestampCriacao),
          status: 'ATIVO',
          origem: 'Cadastro Inicial',
          observacao: 'Contrato gerado no cadastro inicial do cliente.',
          ownerId: auth.currentUser?.uid,
          totalLucroGerado: 0
        });

        // Registrar no historico
        await addDoc(collection(db, 'devedores', docRef.id, 'historico'), {
          data: Timestamp.fromDate(timestampCriacao),
          tipo: 'APORTE',
          valorTotal: devedor.saldoDevedorAtual,
          valorJuros: 0,
          valorAmortizado: 0,
          saldoRestante: devedor.saldoDevedorAtual,
          observacao: 'Capital inicial do cadastro',
          ownerId: auth.currentUser?.uid,
          criadoPorEmail: auth.currentUser?.email || null,
          criadoPorNome: auth.currentUser?.displayName || auth.currentUser?.email || null,
          emprestimoId: empRef.id,
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

      // 1. Devedores que pertencem diretamente ao usuário
      const qProprios = query(
        collection(db, path), 
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('nomeCompleto', 'asc')
      );
      const snapshotProprios = await getDocs(qProprios);
      const devedoresProprios = snapshotProprios.docs.map(doc => ({ id: doc.id, ...doc.data() } as Devedor));

      // 2. Carteiras que foram compartilhadas com o usuário
      const carteiras = await servicoCarteiras.listarCarteiras();
      const idsCarteirasCompartilhadas = carteiras
        .filter(c => c.ownerId !== auth.currentUser?.uid)
        .map(c => c.id);

      let devedoresCompartilhados: Devedor[] = [];
      if (idsCarteirasCompartilhadas.length > 0) {
        // Encontra todos os devedores que pertencem a essas carteiras compartilhadas
        const qCompartilhados = query(
          collection(db, path),
          where('carteiraId', 'in', idsCarteirasCompartilhadas)
        );
        const snapshotCompartilhados = await getDocs(qCompartilhados);
        devedoresCompartilhados = snapshotCompartilhados.docs.map(doc => ({ id: doc.id, ...doc.data() } as Devedor));
      }

      // Consolidar e remover duplicados
      const mapa = new Map<string, Devedor>();
      devedoresProprios.forEach(d => mapa.set(d.id!, d));
      devedoresCompartilhados.forEach(d => mapa.set(d.id!, d));

      const devedoresConsolidados = Array.from(mapa.values());

      // Buscar os empréstimos correspondentes de cada um para popular a UI
      const devedoresComEmprestimos = await Promise.all(
        devedoresConsolidados.map(async (d) => {
          const emprestimos = await servicoEmprestimos.listarEmprestimos(d.id!);
          return {
            ...d,
            emprestimos,
          };
        })
      );

      return devedoresComEmprestimos.sort((a, b) => 
        a.nomeCompleto.localeCompare(b.nomeCompleto)
      );
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
        const d = { id: snapshot.id, ...snapshot.data() } as Devedor;
        const emprestimos = await servicoEmprestimos.listarEmprestimos(d.id!);
        return {
          ...d,
          emprestimos
        };
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
      await updateDoc(docRef, {
        ...dados,
        ultimaAlteracaoPorEmail: auth.currentUser?.email || null,
        ultimaAlteracaoPorNome: auth.currentUser?.displayName || auth.currentUser?.email || null,
        ultimaAlteracaoData: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async excluirDevedor(id: string) {
    const path = `devedores/${id}`;
    try {
      const docRef = doc(db, 'devedores', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
