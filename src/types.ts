export interface Devedor {
  id?: string;
  idDevedor?: string;
  ownerId: string;
  nomeCompleto: string;
  whatsapp: string;
  taxaJurosMensal: number;
  saldoDevedorAtual: number;
  totalLucroGerado: number;
  dataCriacao: any;
  diaVencimento?: number;
  ultimoPagamento?: any;
  endereco?: string;
  observacoes?: string;
  carteiraId?: string | null;
  criadoPorEmail?: string;
  criadoPorNome?: string;
  ultimaAlteracaoPorEmail?: string;
  ultimaAlteracaoPorNome?: string;
  ultimaAlteracaoData?: any;
  emprestimos?: Emprestimo[];
}

export interface Emprestimo {
  id?: string;
  valorBruto: number;
  saldoDevedor: number;
  taxaJurosMensal: number;
  diaVencimento: number;
  dataInicio: any;
  dataVencimento?: any;
  status: 'ATIVO' | 'QUITADO';
  origem?: string;
  observacao?: string;
  ultimoPagamento?: any;
  totalLucroGerado?: number;
}

export interface Carteira {
  id: string;
  nome: string;
  ownerId: string;
  ownerEmail?: string;
  emailsCompartilhados?: string[];
  dataCriacao: any;
}

export type TipoTransacao = 'PAGAMENTO' | 'APORTE';

export interface Historico {
  id?: string;
  data: any;
  tipo: TipoTransacao;
  valorTotal: number;
  valorJuros: number;
  valorAmortizado: number;
  saldoRestante: number;
  observacao: string;
  criadoPorEmail?: string;
  criadoPorNome?: string;
}
