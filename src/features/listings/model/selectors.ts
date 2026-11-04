import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../app/store';
import { contactRate, normalizeText } from '../../../lib/format';
import type { SortDir, SortKey } from './filtersSlice';
import { listingsAdapter } from './listingsSlice';
import { eligibleIds } from './statusRules';
import type { BulkAction } from './statusRules';
import { LISTING_STATUSES } from './types';
import type { Listing, ListingStatus } from './types';

const adapterSelectors = listingsAdapter.getSelectors((state: RootState) => state.listings);

export const selectConfirmedListings = adapterSelectors.selectAll;
export const selectMutations = (state: RootState) => state.listings.mutations;
export const selectLoadStatus = (state: RootState) => state.listings.loadStatus;
export const selectLoadError = (state: RootState) => state.listings.loadError;
export const selectFilters = (state: RootState) => state.filters;
export const selectSelectionMap = (state: RootState) => state.selection.ids;

/**
 * Dados confirmados + alterações pendentes, na ordem de envio. Linha sem alteração
 * mantém a mesma referência, então o React.memo da linha continua valendo.
 */
export const selectListings = createSelector(
  [selectConfirmedListings, selectMutations],
  (rows, mutations): Listing[] => {
    if (mutations.length === 0) return rows;
    const patches = new Map<string, Partial<Listing>>();
    for (const mutation of mutations) {
      for (const id of mutation.ids) {
        patches.set(id, { ...patches.get(id), ...mutation.patch });
      }
    }
    return rows.map((row) => {
      const patch = patches.get(row.id);
      return patch ? { ...row, ...patch } : row;
    });
  },
);

export const selectListingsById = createSelector(
  [selectListings],
  (rows) => new Map(rows.map((row) => [row.id, row])),
);

export const selectPendingIds = createSelector(
  [selectMutations],
  (mutations) => new Set(mutations.flatMap((mutation) => mutation.ids)),
);

const selectSearchIndex = createSelector(
  [selectListings],
  (rows) =>
    new Map(rows.map((row) => [row.id, normalizeText(`${row.title} ${row.id} ${row.city} ${row.uf} ${row.category}`)])),
);

/**
 * Todos os filtros menos status. Separar esta etapa permite duas coisas: trocar de
 * aba não refaz a busca de texto, e as contagens das abas respeitam os outros filtros.
 */
export const selectFilteredExceptStatus = createSelector(
  [
    selectListings,
    selectSearchIndex,
    (state: RootState) => state.filters.search,
    (state: RootState) => state.filters.category,
    (state: RootState) => state.filters.priceMinCents,
    (state: RootState) => state.filters.priceMaxCents,
  ],
  (rows, index, search, category, min, max) => {
    const terms = normalizeText(search).split(/\s+/).filter(Boolean);
    return rows.filter((row) => {
      if (category !== 'todas' && row.category !== category) return false;
      if (min !== null && row.priceCents < min) return false;
      if (max !== null && row.priceCents > max) return false;
      const haystack = index.get(row.id) ?? '';
      return terms.every((term) => haystack.includes(term));
    });
  },
);

export const selectFilteredListings = createSelector(
  [selectFilteredExceptStatus, (state: RootState) => state.filters.status],
  (rows, status) => (status === 'todos' ? rows : rows.filter((row) => row.status === status)),
);

export const selectStatusCounts = createSelector([selectFilteredExceptStatus], (rows) => {
  const counts = Object.fromEntries(LISTING_STATUSES.map((status) => [status, 0])) as Record<ListingStatus, number>;
  for (const row of rows) counts[row.status] += 1;
  return { ...counts, todos: rows.length };
});

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

const COMPARE: Record<SortKey, (a: Listing, b: Listing) => number> = {
  // ISO 8601 ordena certo como texto.
  recentes: (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0),
  titulo: (a, b) => collator.compare(a.title, b.title),
  preco: (a, b) => a.priceCents - b.priceCents,
  visualizacoes: (a, b) => a.views - b.views,
  contatos: (a, b) => a.contacts - b.contacts,
  expira: (a, b) => (a.expiresAt < b.expiresAt ? -1 : a.expiresAt > b.expiresAt ? 1 : 0),
};

export function sortListings(rows: readonly Listing[], key: SortKey, dir: SortDir): Listing[] {
  const compare = COMPARE[key];
  const sign = dir === 'asc' ? 1 : -1;
  // O id desempata, para a ordem não mudar entre um clique e outro.
  return [...rows].sort((a, b) => sign * compare(a, b) || a.id.localeCompare(b.id));
}

export const selectSortedListings = createSelector(
  [selectFilteredListings, (state: RootState) => state.filters.sortKey, (state: RootState) => state.filters.sortDir],
  sortListings,
);

export const selectPageInfo = createSelector(
  [
    (state: RootState) => selectFilteredListings(state).length,
    (state: RootState) => state.filters.page,
    (state: RootState) => state.filters.pageSize,
  ],
  (total, requestedPage, pageSize) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // A página pode ficar além do fim quando um anúncio sai do filtro depois de uma ação.
    const page = Math.min(requestedPage, totalPages);
    const startIndex = (page - 1) * pageSize;
    return { page, pageSize, total, totalPages, startIndex, endIndex: Math.min(startIndex + pageSize, total) };
  },
);

export const selectPageRows = createSelector([selectSortedListings, selectPageInfo], (rows, info) =>
  rows.slice(info.startIndex, info.endIndex),
);

/** Resumo do topo: sempre a conta inteira, independente dos filtros. */
export const selectAccountSummary = createSelector([selectListings], (rows) => {
  let views = 0;
  let contacts = 0;
  let activeCount = 0;
  let activeValueCents = 0;
  for (const row of rows) {
    views += row.views;
    contacts += row.contacts;
    if (row.status === 'ativo') {
      activeCount += 1;
      activeValueCents += row.priceCents;
    }
  }
  return { total: rows.length, views, contacts, rate: contactRate(views, contacts), activeCount, activeValueCents };
});

export const selectSelectedIds = createSelector([selectSelectionMap], (map) => Object.keys(map));

const selectSelectedRows = createSelector([selectSelectedIds, selectListingsById], (ids, byId) =>
  ids.flatMap((id) => byId.get(id) ?? []),
);

/** Para cada ação, quais dos selecionados podem recebê-la. A barra mostra e usa esta conta. */
export const selectBulkPlan = createSelector(
  [selectSelectedRows],
  (rows): Record<BulkAction, string[]> => ({
    pausar: eligibleIds('pausar', rows),
    reativar: eligibleIds('reativar', rows),
    vender: eligibleIds('vender', rows),
  }),
);

export const selectHasActiveFilters = createSelector(
  [
    (state: RootState) => state.filters.search,
    (state: RootState) => state.filters.status,
    (state: RootState) => state.filters.category,
    (state: RootState) => state.filters.priceMinCents,
    (state: RootState) => state.filters.priceMaxCents,
  ],
  (search, status, category, min, max) =>
    search.trim() !== '' || status !== 'todos' || category !== 'todas' || min !== null || max !== null,
);
