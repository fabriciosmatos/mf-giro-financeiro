import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const VERSAO_SISTEMA = '4.2.0';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function aplicarMascaraDinheiro(val: string): string {
  const apenasDigitos = val.replace(/\D/g, '');
  if (!apenasDigitos) return '';
  
  const valorNumerico = parseFloat(apenasDigitos) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valorNumerico);
}

export function obterValorNumericoDeMascara(valFormatado: string): number {
  if (!valFormatado) return 0;
  const limpo = valFormatado.replace(/\./g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

export function formatarNumeroParaMascara(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);
}
