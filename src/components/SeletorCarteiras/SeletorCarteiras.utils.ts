/**
 * Funções puras utilitárias para o Seletor de Carteiras (SeletorCarteiras).
 * Todas as nomenclaturas, comentários e variáveis estão rigorosamente em PORTUGUÊS.
 */

import { Devedor } from '../../types';

/**
 * Filtra e retorna a lista de devedores que não pertencem a nenhuma carteira (Geral).
 */
export function obterDevedoresSemCarteira(devedores: Devedor[]): Devedor[] {
  return devedores.filter(devedor => !devedor.carteiraId);
}

/**
 * Calcula a quantidade de devedores sem carteira.
 */
export function contarDevedoresSemCarteira(devedores: Devedor[]): number {
  return obterDevedoresSemCarteira(devedores).length;
}

/**
 * Calcula o saldo total devido de devedores sem carteira.
 */
export function calcularSaldoSemCarteira(devedores: Devedor[]): number {
  return obterDevedoresSemCarteira(devedores).reduce((acumulador, devedor) => acumulador + devedor.saldoDevedorAtual, 0);
}

/**
 * Filtra e retorna os devedores associados a uma carteira específica.
 */
export function obterDevedoresPorCarteira(devedores: Devedor[], carteiraId: string): Devedor[] {
  return devedores.filter(devedor => devedor.carteiraId === carteiraId);
}

/**
 * Calcula a quantidade de devedores em uma carteira específica.
 */
export function contarDevedoresPorCarteira(devedores: Devedor[], carteiraId: string): number {
  return obterDevedoresPorCarteira(devedores, carteiraId).length;
}

/**
 * Calcula o saldo total devido de devedores de uma carteira específica.
 */
export function calcularSaldoPorCarteira(devedores: Devedor[], carteiraId: string): number {
  return obterDevedoresPorCarteira(devedores, carteiraId).reduce((acumulador, devedor) => acumulador + devedor.saldoDevedorAtual, 0);
}
