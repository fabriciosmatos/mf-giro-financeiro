import { useState, useEffect } from 'react';
import { Devedor, Historico } from '../../types';
import { servicoDados } from '../../services/servicoDados';

interface UseHistoricoListaProps {
  devedor: Devedor;
}

export function useHistoricoLista({ devedor }: UseHistoricoListaProps) {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [devedorAtual, setDevedorAtual] = useState<Devedor>(devedor);
  const [carregando, setCarregando] = useState(true);

  async function recarregar() {
    if (!devedor.id) return;
    try {
      const [dados, devedorDoc] = await Promise.all([
        servicoDados.listarHistorico(devedor.id),
        servicoDados.buscarDevedor(devedor.id)
      ]);
      setHistorico(dados);
      if (devedorDoc) {
        setDevedorAtual(devedorDoc);
      }
    } catch (erro) {
      console.error('Erro ao listar historico:', erro);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    setDevedorAtual(devedor);
    recarregar();
  }, [devedor.id]);

  return {
    historico,
    devedorAtual,
    carregando,
    recarregar,
  };
}
