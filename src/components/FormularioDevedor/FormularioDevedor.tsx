/**
 * Componente Visual FormularioDevedor.
 * Mantém o design JSX para cadastro/edição de devedores e integra uma interface de controle de contratos (subcontratos/empréstimos)
 * com edição direta de termos, porcentagens e saldos devedores, com recálculo automático em tempo real no banco de dados.
 * Todas as nomenclaturas, termos e textos estão rigorosamente em português e os nomes de arquivos também.
 */

import React, { useState } from 'react';
import { Devedor, Carteira, Emprestimo } from '../../types';
import { useFormularioDevedor } from './useFormularioDevedor';
import { BotaoConfirmarDuploClique } from '../BotaoConfirmarDuploClique';
import { formatarMoeda } from '../../lib/utils';
import { servicoDados } from '../../services/servicoDados';
import { Pencil, Calendar, Percent, Landmark, Trash2 } from 'lucide-react';

interface FormularioDevedorProps {
  onSuccess: () => void;
  devedorParaEditar?: Devedor;
  carteiras: Carteira[];
  carteiraAtivaId?: string | null;
}

export function FormularioDevedor({
  onSuccess,
  devedorParaEditar,
  carteiras,
  carteiraAtivaId,
}: FormularioDevedorProps) {
  const {
    nomeCompleto,
    setNomeCompleto,
    whatsapp,
    setWhatsapp,
    endereco,
    setEndereco,
    observacoes,
    setObservacoes,
    carteiraId,
    setCarteiraId,
    carregando,
    lidarComEnvio,
    podeMovimentar,
  } = useFormularioDevedor({
    onSuccess,
    devedorParaEditar,
    carteiras,
    carteiraAtivaId,
  });

  // Gerenciamento e Edição de Contratos do Devedor
  const [contractCarregando, setContractCarregando] = useState<string | null>(null);
  const [idContratoEditando, setIdContratoEditando] = useState<string | null>(null);
  const [camposEdicao, setCamposEdicao] = useState({
    saldoDevedor: 0,
    taxaJurosMensal: 0,
    diaVencimento: 1,
    dataInicioString: '',
    status: 'ATIVO' as 'ATIVO' | 'QUITADO'
  });

  const iniciarEdicaoContrato = (emp: Emprestimo) => {
    let dataStr = '';
    if (emp.dataInicio) {
      const rawDate = emp.dataInicio.toDate ? emp.dataInicio.toDate() : new Date(emp.dataInicio);
      dataStr = rawDate.toISOString().split('T')[0];
    } else {
      dataStr = new Date().toISOString().split('T')[0];
    }

    setCamposEdicao({
      saldoDevedor: emp.saldoDevedor || 0,
      taxaJurosMensal: emp.taxaJurosMensal || 0,
      diaVencimento: emp.diaVencimento || 1,
      dataInicioString: dataStr,
      status: emp.status || 'ATIVO'
    });
    setIdContratoEditando(emp.id || null);
  };

  const salvarEdicaoContrato = async (empId: string) => {
    if (!devedorParaEditar?.id) return;
    setContractCarregando(empId);
    try {
      const dataDate = new Date(camposEdicao.dataInicioString + 'T12:00:00');
      
      await servicoDados.atualizarEmprestimo(devedorParaEditar.id, empId, {
        saldoDevedor: Number(camposEdicao.saldoDevedor),
        taxaJurosMensal: Number(camposEdicao.taxaJurosMensal),
        diaVencimento: Number(camposEdicao.diaVencimento),
        dataInicio: dataDate,
        status: camposEdicao.status
      });

      // Recalcular saldo total do devedor principal para manter tudo sincronizado
      const emprestimos = await servicoDados.listarEmprestimos(devedorParaEditar.id);
      const ativos = emprestimos.filter(e => e.status === 'ATIVO');
      const totalSaldo = ativos.reduce((sum, e) => sum + (e.saldoDevedor || 0), 0);

      // Sincroniza dados com o cabeçalho consolidado
      const params: any = {
        saldoDevedorAtual: Number(totalSaldo.toFixed(2)),
      };
      if (ativos.length > 0) {
        params.taxaJurosMensal = ativos[0].taxaJurosMensal || 0;
        params.diaVencimento = ativos[0].diaVencimento || 1;
      }
      await servicoDados.atualizarDevedor(devedorParaEditar.id, params);

      alert('Contrato atualizado com sucesso!');
      setIdContratoEditando(null);
      onSuccess(); // Dispara o refresh na listagem do painel de controle
    } catch (err) {
      console.error('Erro ao atualizar contrato:', err);
      alert('Erro ao salvar as edições do contrato.');
    } finally {
      setContractCarregando(null);
    }
  };

  const excluirContrato = async (empId: string) => {
    if (!devedorParaEditar?.id) return;
    setContractCarregando(empId);
    try {
      await servicoDados.deletarEmprestimo(devedorParaEditar.id, empId);

      // Recalcular saldo total
      const emprestimos = await servicoDados.listarEmprestimos(devedorParaEditar.id);
      const ativos = emprestimos.filter(e => e.status === 'ATIVO');
      const totalSaldo = ativos.reduce((sum, e) => sum + (e.saldoDevedor || 0), 0);

      const params: any = {
        saldoDevedorAtual: Number(totalSaldo.toFixed(2)),
      };
      if (ativos.length > 0) {
        params.taxaJurosMensal = ativos[0].taxaJurosMensal || 0;
        params.diaVencimento = ativos[0].diaVencimento || 1;
      } else {
        params.taxaJurosMensal = 0;
        params.diaVencimento = 1;
      }
      await servicoDados.atualizarDevedor(devedorParaEditar.id, params);

      alert('Contrato excluído com sucesso!');
      setIdContratoEditando(null);
      onSuccess(); // Dispara o refresh na listagem
    } catch (err) {
      console.error('Erro ao deletar contrato:', err);
      alert('Erro ao excluir o contrato.');
    } finally {
      setContractCarregando(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-giro-text">
      {/* Formulário Principal de Edição de Dados Cadastrais */}
      <form onSubmit={lidarComEnvio} className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2 tracking-tight">Nome Completo</label>
          <input 
            type="text" 
            value={nomeCompleto}
            onChange={e => setNomeCompleto(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary text-giro-text font-semibold"
            placeholder="Ex: João da Silva"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">WhatsApp</label>
            <input 
              type="tel" 
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary text-giro-text font-semibold"
              placeholder="11999999999"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 tracking-tight">Carteira (Segmentação)</label>
          <select
            value={carteiraId}
            onChange={e => setCarteiraId(e.target.value)}
            disabled={!podeMovimentar}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary font-bold text-sm text-giro-text disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">Geral</option>
            {carteiras.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          {!podeMovimentar && (
            <p className="text-[10px] font-bold text-amber-600 mt-1.5 uppercase tracking-tight font-black">
              ⚠ Apenas o proprietário desta carteira pode transferir este card.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 tracking-tight">Endereço (Opcional)</label>
          <textarea 
            value={endereco}
            onChange={e => setEndereco(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary min-h-[80px]"
            placeholder="Ex: Rua das Flores, 123 - Centro"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 tracking-tight">Observações Gerais (Opcional)</label>
          <textarea 
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary min-h-[80px]"
            placeholder="Notas importantes sobre o cliente..."
          />
        </div>

        <BotaoConfirmarDuploClique
          originalText={devedorParaEditar ? 'Atualizar Cadastro' : 'Salvar Novo Devedor'}
          confirmText="Confirmar clique duplo..."
          loadingText="Salvando..."
          carregando={carregando}
          className="nu-button-primary w-full mt-2 cursor-pointer"
        />
      </form>

      {/* Seção Exclusiva para Editar os Contratos / Porcentagens Atuais (Somente Edição de Devedor Existente) */}
      {devedorParaEditar && (
        <div className="mt-8 border-t border-gray-200/60 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase text-giro-text-muted tracking-widest flex items-center gap-1.5">
              <span>Contratos & Porcentagens Ativas</span>
              <span className="bg-gray-100 text-giro-text px-2 py-0.5 rounded-full text-[9px] font-bold">
                {devedorParaEditar.emprestimos?.length || 0}
              </span>
            </h4>
          </div>

          <div className="flex flex-col gap-4">
            {(!devedorParaEditar.emprestimos || devedorParaEditar.emprestimos.length === 0) ? (
              <p className="text-[11px] font-semibold text-giro-text-muted text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                Este cliente não possui empréstimos/contratos registrados.
              </p>
            ) : (
              devedorParaEditar.emprestimos.map((emp, idx) => {
                const ehEditando = idContratoEditando === emp.id;
                const formatadoData = emp.dataInicio
                  ? (emp.dataInicio.toDate ? emp.dataInicio.toDate() : new Date(emp.dataInicio)).toLocaleDateString('pt-BR')
                  : '';

                return (
                  <div 
                    key={emp.id} 
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      ehEditando 
                        ? 'bg-blue-50/5 border-blue-200 shadow-md ring-1 ring-blue-100/50' 
                        : 'bg-white border-gray-100 shadow-sm hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-gray-100/40 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-giro-text tracking-wider">
                          Contrato #{emp.id?.slice(-4).toUpperCase() || (idx + 1)}
                        </span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase ${
                          emp.status === 'ATIVO' 
                            ? 'bg-orange-50 text-orange-750 border border-orange-100' 
                            : 'bg-green-50 text-green-750 border border-green-100'
                        }`}>
                          {emp.status}
                        </span>
                      </div>

                      {!ehEditando && (
                        <button
                          type="button"
                          onClick={() => iniciarEdicaoContrato(emp)}
                          className="p-1 px-2.5 bg-gray-50 hover:bg-giro-primary/5 text-giro-primary rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border border-transparent hover:border-giro-primary/10"
                        >
                          <Pencil className="w-3 h-3 text-giro-primary" /> Editar Termos
                        </button>
                      )}
                    </div>

                    {ehEditando ? (
                      <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-black uppercase text-giro-text-muted mb-1 tracking-wider">Saldo Devedor (R$)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={camposEdicao.saldoDevedor}
                              onChange={e => setCamposEdicao({ ...camposEdicao, saldoDevedor: Number(e.target.value) })}
                              className="w-full text-xs font-bold p-2.5 bg-giro-bg rounded-xl border-0 focus:ring-1 focus:ring-giro-primary text-giro-text"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase text-giro-text-muted mb-1 tracking-wider">Taxa de Juros (%)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={camposEdicao.taxaJurosMensal}
                              onChange={e => setCamposEdicao({ ...camposEdicao, taxaJurosMensal: Number(e.target.value) })}
                              className="w-full text-xs font-bold p-2.5 bg-giro-bg rounded-xl border-0 focus:ring-1 focus:ring-giro-primary text-giro-text"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-black uppercase text-giro-text-muted mb-1 tracking-wider">Dia do Vencimento</label>
                            <input 
                              type="number" 
                              min="1"
                              max="31"
                              value={camposEdicao.diaVencimento}
                              onChange={e => setCamposEdicao({ ...camposEdicao, diaVencimento: Number(e.target.value) })}
                              className="w-full text-xs font-bold p-2.5 bg-giro-bg rounded-xl border-0 focus:ring-1 focus:ring-giro-primary text-giro-text"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase text-giro-text-muted mb-1 tracking-wider">Data de Início</label>
                            <input 
                              type="date"
                              value={camposEdicao.dataInicioString}
                              onChange={e => setCamposEdicao({ ...camposEdicao, dataInicioString: e.target.value })}
                              className="w-full text-xs font-bold p-2.5 bg-giro-bg rounded-xl border-0 focus:ring-1 focus:ring-giro-primary text-giro-text cursor-pointer"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[8px] font-black uppercase text-giro-text-muted mb-1 tracking-wider">Status do Contrato</label>
                          <select
                            value={camposEdicao.status}
                            onChange={e => setCamposEdicao({ ...camposEdicao, status: e.target.value as 'ATIVO' | 'QUITADO' })}
                            className="w-full text-xs font-bold p-2.5 bg-giro-bg rounded-xl border-0 focus:ring-1 focus:ring-giro-primary text-giro-text"
                            required
                          >
                            <option value="ATIVO">ATIVO</option>
                            <option value="QUITADO">QUITADO (Liquidado)</option>
                          </select>
                        </div>

                        {/* Botões de Ações de Contratos com Confirmação de Clique Duplo */}
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-100/60">
                          <div className="grid grid-cols-2 gap-2">
                            <BotaoConfirmarDuploClique
                              type="button"
                              originalText="Salvar Alterações"
                              confirmText="Confirmar Salvar..."
                              loadingText="Salvando..."
                              carregando={contractCarregando === emp.id}
                              className="p-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer flex items-center justify-center border-0"
                              onClick={() => salvarEdicaoContrato(emp.id!)}
                            />

                            <button
                              type="button"
                              onClick={() => setIdContratoEditando(null)}
                              className="p-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-giro-text rounded-xl text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer flex items-center justify-center transition-all border-0"
                            >
                              Cancelar
                            </button>
                          </div>

                          <BotaoConfirmarDuploClique
                            type="button"
                            originalText="Excluir este Contrato"
                            confirmText="Tem certeza? Clique duplo..."
                            loadingText="Excluindo..."
                            carregando={contractCarregando === emp.id}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-[8px] font-black uppercase tracking-wider text-center cursor-pointer flex items-center justify-center transition-all mt-1"
                            onClick={() => excluirContrato(emp.id!)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] text-giro-text-muted font-semibold">
                        <div className="flex justify-between border-b border-gray-100/30 pb-1">
                          <span className="flex items-center gap-1"><Landmark className="w-3 h-3 text-giro-text-muted/50" /> Saldo:</span>
                          <span className="font-extrabold text-giro-text">{formatarMoeda(emp.saldoDevedor)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100/30 pb-1">
                          <span className="flex items-center gap-1"><Percent className="w-3 h-3 text-giro-text-muted/50" /> Juros:</span>
                          <span className="font-extrabold text-giro-text">{emp.taxaJurosMensal}% / mês</span>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-giro-text-muted/50" /> Dia Venc:</span>
                          <span className="font-extrabold text-giro-text">{emp.diaVencimento}</span>
                        </div>
                        <div className="flex justify-between pt-0.5">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-giro-text-muted/50" /> Início:</span>
                          <span className="font-extrabold text-giro-text">{formatadoData}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
