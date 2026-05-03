import React, { useState } from 'react';
import { servicoDados } from '../services/servicoDados';

interface FormDevedorProps {
  onSuccess: () => void;
  devedorParaEditar?: Devedor;
}

export default function FormDevedor({ onSuccess, devedorParaEditar }: FormDevedorProps) {
  const [nome, setNome] = useState(devedorParaEditar?.nomeCompleto || '');
  const [whats, setWhats] = useState(devedorParaEditar?.whatsapp || '');
  const [taxa, setTaxa] = useState(devedorParaEditar?.taxaJurosMensal.toString() || '10');
  const [saldo, setSaldo] = useState(devedorParaEditar?.saldoDevedorAtual.toString() || '');
  const [endereco, setEndereco] = useState(devedorParaEditar?.endereco || '');
  const [observacoes, setObservacoes] = useState(devedorParaEditar?.observacoes || '');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [diaVencimento, setDiaVencimento] = useState(devedorParaEditar?.diaVencimento?.toString() || new Date().getDate().toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (devedorParaEditar?.id) {
        await servicoDados.atualizarDevedor(devedorParaEditar.id, {
          nomeCompleto: nome,
          whatsapp: whats,
          taxaJurosMensal: Number(taxa),
          diaVencimento: Number(diaVencimento),
          endereco: endereco || '',
          observacoes: observacoes || '',
        });
      } else {
        await servicoDados.criarDevedor({
          nomeCompleto: nome,
          whatsapp: whats,
          taxaJurosMensal: Number(taxa),
          saldoDevedorAtual: Number(saldo),
          diaVencimento: Number(diaVencimento),
          dataCriacao: new Date(dataInicio + 'T12:00:00'),
          endereco: endereco || '',
          observacoes: observacoes || '',
          ownerId: '', 
        });
      }
      onSuccess();
    } catch (e) {
      alert('Erro ao salvar devedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-semibold mb-2 tracking-tight">Nome Completo</label>
        <input 
          type="text" 
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
          placeholder="Ex: João da Silva"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">WhatsApp</label>
          <input 
            type="tel" 
            value={whats}
            onChange={e => setWhats(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
            placeholder="11999999999"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Taxa Juros (%)</label>
          <input 
            type="number" 
            value={taxa}
            onChange={e => setTaxa(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Dia do Vencimento</label>
          <input 
            type="number" 
            min="1"
            max="31"
            value={diaVencimento}
            onChange={e => setDiaVencimento(e.target.value)}
            className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
            required
          />
        </div>
        {!devedorParaEditar && (
          <div>
            <label className="block text-sm font-semibold mb-2">Data de Início</label>
            <input 
              type="date" 
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary"
              required
            />
          </div>
        )}
      </div>

      {!devedorParaEditar && (
        <div>
          <label className="block text-sm font-semibold mb-2">Saldo Devedor Inicial (R$)</label>
          <input 
            type="number" 
            step="0.01"
            value={saldo}
            onChange={e => setSaldo(e.target.value)}
            className="w-full text-xl font-bold p-4 bg-giro-bg rounded-2xl border-0 focus:ring-2 focus:ring-giro-primary font-mono"
            placeholder="0,00"
            required
          />
        </div>
      )}

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

      <button disabled={loading} type="submit" className="nu-button-primary w-full mt-2">
        {loading ? 'Salvando...' : devedorParaEditar ? 'Atualizar Cadastro' : 'Salvar Novo Devedor'}
      </button>
    </form>
  );
}

import { Devedor } from '../types';
