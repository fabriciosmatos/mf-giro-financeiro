import { useState, useEffect } from 'react';
import { Devedor, Historico } from '../../types';
import { servicoDados } from '../../services/servicoDados';

interface UseHistoricoListaProps {
  devedor: Devedor;
}

export function useHistoricoLista({ devedor }: UseHistoricoListaProps) {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      if (!devedor.id) return;
      try {
        const dados = await servicoDados.listarHistorico(devedor.id);
        setHistorico(dados);
      } catch (erro) {
        console.error('Erro ao listar historico:', erro);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [devedor.id]);

  return {
    historico,
    carregando,
  };
}
