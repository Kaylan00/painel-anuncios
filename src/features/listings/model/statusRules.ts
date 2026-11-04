import type { Listing, ListingStatus } from './types';

export const BULK_ACTIONS = ['pausar', 'reativar', 'vender'] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

interface Rule {
  from: readonly ListingStatus[];
  to: ListingStatus;
}

/** Fonte única das transições: a tela e a API falsa consultam a mesma tabela. */
export const BULK_RULES: Record<BulkAction, Rule> = {
  pausar: { from: ['ativo'], to: 'pausado' },
  reativar: { from: ['pausado', 'expirado'], to: 'ativo' },
  vender: { from: ['ativo', 'pausado', 'expirado'], to: 'vendido' },
};

export function canApply(action: BulkAction, status: ListingStatus): boolean {
  return BULK_RULES[action].from.includes(status);
}

export function canTransition(from: ListingStatus, to: ListingStatus): boolean {
  return Object.values(BULK_RULES).some((rule) => rule.to === to && rule.from.includes(from));
}

export function eligibleIds(action: BulkAction, listings: readonly Listing[]): string[] {
  return listings.filter((listing) => canApply(action, listing.status)).map((listing) => listing.id);
}
