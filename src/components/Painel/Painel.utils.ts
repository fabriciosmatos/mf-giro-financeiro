/**
 * Utilitários puros de suporte para o componente Painel.
 * Todas as nomenclaturas e comentários estão rigorosamente em português.
 */

import { Devedor, Carteira } from '../../types';

/**
 * Retorna o nome amigável da carteira ativa ou 'Geral' se não houver ID.
 */
export function obterNomeCarteira(carteiraAtivaId: string | null, carteiras: Carteira[]): string {
  if (carteiraAtivaId === 'sem-carteira' || !carteiraAtivaId) {
    return 'Geral';
  }
  const carteiraEncontrada = carteiras.find(c => c.id === carteiraAtivaId);
  return carteiraEncontrada ? carteiraEncontrada.nome : 'Geral';
}

/**
 * Encontra a carteira associada a um devedor para exibir o nome correto.
 */
export function obterCarteiraDoDevedor(devedor: Devedor, carteiras: Carteira[]): string {
  if (!devedor.carteiraId) {
    return 'Geral';
  }
  const carteira = carteiras.find(c => c.id === devedor.carteiraId);
  return carteira ? carteira.nome : 'Outra';
}
