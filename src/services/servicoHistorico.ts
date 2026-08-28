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
import { extrairData } from '../lib/financeiro/statusLogic';

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
        getDocs(historicoRef),
        getDocs(emprestimosRef),
        getDoc(devedorRef)
      ]);

      if (!devedorSnap.exists()) return;

      const devedorDocData = devedorSnap.data();
      const historicoList = historicoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Historico));
      
      // Ordenação segura em memória Javascript imune a diferenças de tipo de dado no Firestore
      historicoList.sort((a, b) => {
        const timeA = a.data?.toDate ? a.data.toDate().getTime() : new Date(a.data).getTime();
        const timeB = b.data?.toDate ? b.data.toDate().getTime() : new Date(b.data).getTime();
        return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
      });

      let emprestimosList = emprestimosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Emprestimo));

      // Se não houver nenhum contrato na subcoleção de empréstimos, criar o contrato inicial correspondente
      if (emprestimosList.length === 0 && devedorDocData) {
        const primeiroAporte = historicoList.find(h => h.tipo === 'APORTE');
        const valorInicial = primeiroAporte ? primeiroAporte.valorTotal : (devedorDocData.saldoDevedorAtual || 0);
        const dataInicioRef = primeiroAporte ? primeiroAporte.data : (devedorDocData.dataCriacao || Timestamp.now());
        
        const novoDocRef = await addDoc(emprestimosRef, {
          valorBruto: valorInicial,
          saldoDevedor: valorInicial,
          taxaJurosMensal: devedorDocData.taxaJurosMensal || 10,
          diaVencimento: devedorDocData.diaVencimento || 1,
          dataInicio: dataInicioRef,
          status: valorInicial === 0 ? 'QUITADO' : 'ATIVO',
          origem: 'Sincronização / Recuperação de Contrato',
          observacao: 'Contrato consolidado via histórico.',
          ownerId: devedorDocData.ownerId || auth.currentUser?.uid,
          totalLucroGerado: 0,
        });

        emprestimosList = [{
          id: novoDocRef.id,
          valorBruto: valorInicial,
          saldoDevedor: valorInicial,
          taxaJurosMensal: devedorDocData.taxaJurosMensal || 10,
          diaVencimento: devedorDocData.diaVencimento || 1,
          dataInicio: dataInicioRef,
          status: valorInicial === 0 ? 'QUITADO' : 'ATIVO',
          totalLucroGerado: 0,
        }];
      }

      // Mapear valores brutos originais com fallback inteligente
      const valorBrutoPorEmp = new Map<string, number>();
      for (const emp of emprestimosList) {
        if (!emp.id) continue;
        let vBruto = Number(emp.valorBruto ?? (emp as any).valorOriginal ?? (emp as any).valor ?? 0);
        if (vBruto === 0) {
          // Tentar encontrar aporte no histórico vinculado a este contrato
          const aporteCorrespondente = historicoList.find(h => h.tipo === 'APORTE' && h.emprestimoId === emp.id);
          if (aporteCorrespondente) {
            vBruto = Number(aporteCorrespondente.valorTotal) || 0;
          } else if (emp.saldoDevedor && emp.saldoDevedor > 0) {
            vBruto = Number(emp.saldoDevedor);
          }
        }
        valorBrutoPorEmp.set(emp.id, vBruto);
      }

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
            : (rawData && typeof (rawData as any).toDate === 'function' 
                ? Timestamp.fromDate((rawData as any).toDate()) 
                : Timestamp.fromDate(new Date(rawData as any)));
          
          if (!ultimoPagamentoGeral || hTimestamp.toMillis() > ultimoPagamentoGeral.toMillis()) {
            ultimoPagamentoGeral = hTimestamp;
          }
          totalLucroGeral += (Number(h.valorJuros) || 0);

          // 1. Se a transação possui detalhamento multicontratos explícito
          if (h.detalheContratos && Array.isArray(h.detalheContratos) && h.detalheContratos.length > 0) {
            for (const det of h.detalheContratos) {
              if (det.emprestimoId) {
                const empAlvo = emprestimosList.find(e => e.id === det.emprestimoId);
                const dInicioEmp = empAlvo?.dataInicio 
                  ? (empAlvo.dataInicio instanceof Timestamp ? empAlvo.dataInicio : Timestamp.fromDate(extrairData(empAlvo.dataInicio)))
                  : null;

                // Só registra ultimoPagamento se o pagamento for no mesmo dia ou posterior ao início do contrato
                if (!dInicioEmp || hTimestamp.toMillis() >= dInicioEmp.toMillis() - (24 * 60 * 60 * 1000)) {
                  const atualTimestamp = ultimoPagamentoPorEmp.get(det.emprestimoId);
                  if (!atualTimestamp || hTimestamp.toMillis() > atualTimestamp.toMillis()) {
                    ultimoPagamentoPorEmp.set(det.emprestimoId, hTimestamp);
                  }
                }
                
                jurosPagosPorEmp.set(
                  det.emprestimoId, 
                  Number(((jurosPagosPorEmp.get(det.emprestimoId) || 0) + (Number(det.jurosPagos) || 0)).toFixed(2))
                );
                amortizacaoPorEmp.set(
                  det.emprestimoId, 
                  Number(((amortizacaoPorEmp.get(det.emprestimoId) || 0) + (Number(det.amortizado) || 0)).toFixed(2))
                );
              }
            }
          } else {
            // 2. Transação vinculada a um contrato único
            let empIdAlvo = h.emprestimoId;

            // Se não houver ID explícito, correlacionar temporalmente de forma precisa
            if (!empIdAlvo) {
              // Filtrar apenas contratos que já existiam na data deste pagamento
              const contratosExistentesNaData = emprestimosList.filter(e => {
                if (!e.dataInicio) return true;
                const dInicio = extrairData(e.dataInicio).getTime();
                // Tolerância de 24h para fusos horários
                return dInicio <= hTimestamp.toMillis() + (24 * 60 * 60 * 1000);
              });

              if (contratosExistentesNaData.length === 1) {
                empIdAlvo = contratosExistentesNaData[0].id;
              } else if (contratosExistentesNaData.length > 1) {
                const dataObj = rawData && typeof (rawData as any).toDate === 'function' 
                  ? (rawData as any).toDate() 
                  : new Date(rawData as any);
                const diaH = dataObj.getDate();
                const diaVencAlvo = h.diaVencimento || diaH;
                const vJuros = Number(h.valorJuros) || 0;
                const vAmort = Number(h.valorAmortizado) || 0;

                // Se houver amortização total ou parcial, buscar contrato com saldo/valor próximo
                if (vAmort > 0) {
                  const empPorSaldo = contratosExistentesNaData.find(e => {
                    const vb = valorBrutoPorEmp.get(e.id || '') || e.saldoDevedor || 0;
                    return Math.abs(vb - vAmort) < 1;
                  });
                  if (empPorSaldo) {
                    empIdAlvo = empPorSaldo.id;
                  }
                }

                // Se não casou por amortização, casar por dia de vencimento exato
                if (!empIdAlvo) {
                  const empMatchDia = contratosExistentesNaData.find(e => e.diaVencimento === diaVencAlvo);
                  if (empMatchDia) {
                    empIdAlvo = empMatchDia.id;
                  }
                }

                // Casar por valor de juros mensal exato
                if (!empIdAlvo && vJuros > 0) {
                  const empMatchJuros = contratosExistentesNaData.find(e => {
                    const vb = valorBrutoPorEmp.get(e.id || '') || e.saldoDevedor || 0;
                    const jurosCalculado = Number((vb * (e.taxaJurosMensal / 100)).toFixed(2));
                    return Math.abs(jurosCalculado - vJuros) < 1;
                  });
                  if (empMatchJuros) {
                    empIdAlvo = empMatchJuros.id;
                  }
                }

                // Casar por proximidade de dia de vencimento (<= 3 dias)
                if (!empIdAlvo) {
                  const empMatchProx = contratosExistentesNaData.find(e => Math.abs((e.diaVencimento || 1) - diaH) <= 3);
                  if (empMatchProx) {
                    empIdAlvo = empMatchProx.id;
                  } else {
                    empIdAlvo = contratosExistentesNaData[0].id;
                  }
                }
              } else if (emprestimosList.length > 0) {
                empIdAlvo = emprestimosList[0].id;
              }
            }

            if (empIdAlvo) {
              const empAlvo = emprestimosList.find(e => e.id === empIdAlvo);
              const dInicioEmp = empAlvo?.dataInicio 
                ? (empAlvo.dataInicio instanceof Timestamp ? empAlvo.dataInicio : Timestamp.fromDate(extrairData(empAlvo.dataInicio)))
                : null;

              // Só registra ultimoPagamento se o pagamento for no mesmo dia ou posterior ao início do contrato
              if (!dInicioEmp || hTimestamp.toMillis() >= dInicioEmp.toMillis() - (24 * 60 * 60 * 1000)) {
                const atualTimestamp = ultimoPagamentoPorEmp.get(empIdAlvo);
                if (!atualTimestamp || hTimestamp.toMillis() > atualTimestamp.toMillis()) {
                  ultimoPagamentoPorEmp.set(empIdAlvo, hTimestamp);
                }
              }

              jurosPagosPorEmp.set(
                empIdAlvo, 
                Number(((jurosPagosPorEmp.get(empIdAlvo) || 0) + (Number(h.valorJuros) || 0)).toFixed(2))
              );
              amortizacaoPorEmp.set(
                empIdAlvo, 
                Number(((amortizacaoPorEmp.get(empIdAlvo) || 0) + (Number(h.valorAmortizado) || 0)).toFixed(2))
              );
            }
          }
        }
      }

      // Atualizar os documentos de empréstimos individuais
      for (const emp of emprestimosList) {
        if (!emp.id) continue;
        const empDocRef = doc(db, 'devedores', devedorId, 'emprestimos', emp.id);
        const ultimoPag = ultimoPagamentoPorEmp.get(emp.id) || null;
        const amort = amortizacaoPorEmp.get(emp.id) || 0;
        const juros = jurosPagosPorEmp.get(emp.id) || 0;
        
        const valorBruto = valorBrutoPorEmp.get(emp.id) || Number(emp.valorBruto || 0);
        const novoSaldo = Math.max(0, Number((valorBruto - amort).toFixed(2)));
        const novoStatus = novoSaldo === 0 ? 'QUITADO' : 'ATIVO';

        const payload: any = {
          valorBruto: valorBruto,
          saldoDevedor: novoSaldo,
          status: novoStatus,
          totalLucroGerado: Number(juros.toFixed(2)),
          ultimoPagamento: ultimoPag
        };

        await updateDoc(empDocRef, payload);
      }

      // Atualizar o devedor consolidado
      const totalSaldoRestante = emprestimosList.reduce((acc, emp) => {
        if (!emp.id) return acc;
        const vBruto = valorBrutoPorEmp.get(emp.id) || Number(emp.valorBruto || 0);
        const amort = amortizacaoPorEmp.get(emp.id) || 0;
        return acc + Math.max(0, Number((vBruto - amort).toFixed(2)));
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

