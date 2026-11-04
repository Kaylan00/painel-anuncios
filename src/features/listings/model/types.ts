export const LISTING_STATUSES = ['ativo', 'pausado', 'expirado', 'vendido'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const CATEGORIES = [
  'Eletrônicos',
  'Veículos',
  'Imóveis',
  'Móveis',
  'Eletrodomésticos',
  'Esportes',
  'Moda',
  'Infantil',
  'Instrumentos',
  'Ferramentas',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Listing {
  id: string;
  title: string;
  category: Category;
  /** Sempre em centavos, para nunca somar ponto flutuante em dinheiro. */
  priceCents: number;
  status: ListingStatus;
  city: string;
  uf: string;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  views: number;
  contacts: number;
  /** Visualizações por dia nos últimos 14 dias, da mais antiga para a mais recente. */
  viewsLast14Days: number[];
  /** Incrementada pelo servidor a cada escrita. Protege contra resposta fora de ordem. */
  version: number;
}

export type ListingEdit = Partial<Pick<Listing, 'title' | 'priceCents'>>;

export const STATUS_LABEL: Record<ListingStatus, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  expirado: 'Expirado',
  vendido: 'Vendido',
};
