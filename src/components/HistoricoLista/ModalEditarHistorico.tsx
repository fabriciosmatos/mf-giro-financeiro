import React, { useState } from 'react';
import { Devedor, Historico } from '../../types';
import { formatarMoeda, formatarData } from '../../lib/utils';
import { servicoDados } from '../../services/servicoDados';
import { extrairData } from '../FormularioTransacao/FormularioTransacao.financeiro';
import { X, Save, Calendar, FileText, CheckCircle2, Landmark } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface ModalEditarHistoricoProps {
  devedor: Devedor;
  historico: Historico;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalEditarHistorico({
  devedor,
  historico,
  onClose,
  onSuccess,
}: ModalEditarHistoricoProps) {
  // Converter data inicial para formato YYYY-MM-DD
  const dataOriginal = historico.data?.toDate ? historico.data.toDate() : new Date(historico.data);
  const dataStrInicial = !isNaN(dataOriginal.getTime())
    ? dataOriginal.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const [dataSelecionada, setDataSelecionada] = useState(dataStrInicial);
  const [emprestimoIdSelecionado, setEmprestimoIdSelecionado] = useState<string>(
    historico.emprestimoId || ''
  );
  const [diaVencimentoPersonalizado, setDiaVencimentoPersonalizado] = useState<number | string>(
    historico.diaVencimento || ''
  );
  const [observacao, setObservacao] = useState(historico.observacao || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const emprestimos = devedor.emprestimos || [];

  // Quando o usuário seleciona um contrato na lista
  const handleSelecionarContrato = (empId: string) => {
    setEmprestimoIdSelecionado(empId);
    if (empId) {
      const emp = emprestimos.find(e => e.id === empId);
      if (emp) {
        setDiaVencimentoPersonalizado(emp.diaVencimento);
      }
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devedor.id || !historico.id) return;

    setSalvando(true);
    setErro(null);

    try {
      // Montar timestamp da nova data
      const partes = dataSelecionada.split('-');
      const ano = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1;
      const dia = parseInt(partes[2], 10);
      const novaData = new Date(ano, mes, dia, 12, 0, 0);
      const timestampFirebase = Timestamp.fromDate(novaData);

      let empIdRef: string | null = emprestimoIdSelecionado || null;
      let diaVencRef: number | null = null;
      let descContratoRef: string | null = null;

      if (empIdRef) {
        const emp = emprestimos.find(e => e.id === empIdRef);
        if (emp) {
          diaVencRef = emp.diaVencimento;
          descContratoRef = `Contrato Venc. Dia ${emp.diaVencimento} (R$ ${emp.valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`;
        }
      } else if (diaVencimentoPersonalizado) {
        diaVencRef = Number(diaVencimentoPersonalizado);
        descContratoRef = `Contrato Venc. Dia ${diaVencRef}`;
      }

      const payloadAtualizacao: Partial<Historico> = {
        data: timestampFirebase,
        observacao: observacao.trim(),
      };

      if (empIdRef) {
        payloadAtualizacao.emprestimoId = empIdRef;
      }
      if (diaVencRef && diaVencRef >= 1 && diaVencRef <= 31) {
        payloadAtualizacao.diaVencimento = diaVencRef;
      }
      if (descContratoRef) {
        payloadAtualizacao.descricaoContrato = descContratoRef;
      }

      await servicoDados.atualizarHistorico(devedor.id, historico.id, payloadAtualizacao);
      await servicoDados.sincronizarDevedorEContratos(devedor.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao atualizar lançamento:', err);
      setErro(err?.message || 'Falha ao salvar as alterações do lançamento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-giro-bg border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-giro-text">Editar Lançamento</h3>
              <p className="text-[11px] font-medium text-giro-text-muted">{devedor.nomeCompleto}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSalvar} className="p-6 overflow-y-auto flex flex-col gap-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {erro}
            </div>
          )}

          {/* Resumo da Transação */}
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-150 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-black tracking-wider text-giro-text-muted">
                Tipo & Valor Original
              </span>
              <span className="text-xs font-bold text-giro-text">
                {historico.tipo === 'PAGAMENTO' ? 'Recebimento / Pagamento' : 'Aporte Concedido'}
              </span>
            </div>
            <span className="text-sm font-black text-giro-primary">
              {formatarMoeda(historico.valorTotal)}
            </span>
          </div>

          {/* Data do Lançamento */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-giro-text flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              Data do Lançamento
            </label>
            <input
              type="date"
              value={dataSelecionada}
              onChange={e => setDataSelecionada(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-giro-text focus:bg-white focus:border-purple-500 focus:outline-none transition-colors"
            />
            <span className="text-[10px] text-giro-text-muted">
              Você pode alterar a data caso tenha sido registrado no dia 17 em vez do dia 18, por exemplo.
            </span>
          </div>

          {/* Vincular a um Contrato Específico */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-giro-text flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-purple-600" />
              Vincular ao Contrato
            </label>
            <select
              value={emprestimoIdSelecionado}
              onChange={e => handleSelecionarContrato(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-giro-text focus:bg-white focus:border-purple-500 focus:outline-none transition-colors"
            >
              <option value="">Selecione um contrato (ou personalize abaixo)</option>
              {emprestimos.map(e => {
                const dataInicioObj = extrairData(e.dataInicio);
                const dataFormatada = dataInicioObj ? formatarData(dataInicioObj) : '';
                const infoData = dataFormatada ? `Data: ${dataFormatada} | ` : '';
                return (
                  <option key={e.id} value={e.id}>
                    Contrato #{e.id?.slice(-4)} — {infoData}Vencimento Todo Dia {e.diaVencimento} (R$ {e.valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) [{e.status}]
                  </option>
                );
              })}
            </select>
          </div>

          {/* Dia de Vencimento de Referência */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-giro-text">
              Dia de Vencimento de Referência (1 a 31)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={diaVencimentoPersonalizado}
              onChange={e => setDiaVencimentoPersonalizado(e.target.value)}
              placeholder="Ex: 18"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-giro-text focus:bg-white focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Observação */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-giro-text">
              Observação / Descrição
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Adicione ou ajuste notas deste lançamento..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-giro-text focus:bg-white focus:border-purple-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-giro-text-muted hover:text-giro-text hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 text-xs font-bold text-white bg-giro-primary hover:bg-purple-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
