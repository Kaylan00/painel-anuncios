import { beforeEach, describe, expect, it } from 'vitest';
import { createAppStore } from '../../../app/store';
import type { RootState } from '../../../app/store';
import { loadedState, makeListing, quietApi } from '../../../test/utils';
import { initialFilters } from './filtersSlice';
import type { FiltersState } from './filtersSlice';
import {
  selectAccountSummary,
  selectBulkPlan,
  selectFilteredExceptStatus,
  selectFilteredListings,
  selectHasActiveFilters,
  selectListings,
  selectPageInfo,
  selectPageRows,
  selectPendingIds,
  selectSortedListings,
  selectStatusCounts,
} from './selectors';
import { pageChanged, sortToggled, statusChanged } from './filtersSlice';
import { rowToggled } from './selectionSlice';
import type { Listing } from './types';

const rows: Listing[] = [
  makeListing({ id: 'AN-1', title: 'Café expresso automático', category: 'Eletrodomésticos', priceCents: 80_000, status: 'ativo', views: 100, contacts: 10, city: 'Vitória' }),
  makeListing({ id: 'AN-2', title: 'Bicicleta aro 29', category: 'Esportes', priceCents: 150_000, status: 'pausado', views: 300, contacts: 3, city: 'Curitiba' }),
  makeListing({ id: 'AN-3', title: 'Bicicleta aro 16', category: 'Infantil', priceCents: 40_000, status: 'ativo', views: 50, contacts: 0, city: 'Serra' }),
  makeListing({ id: 'AN-4', title: 'Apartamento 2 quartos', category: 'Imóveis', priceCents: 30_000_000, status: 'vendido', views: 900, contacts: 40, city: 'Vitória' }),
  makeListing({ id: 'AN-5', title: 'Sofá retrátil', category: 'Móveis', priceCents: 150_000, status: 'expirado', views: 0, contacts: 0, city: 'Santos' }),
];

function state(filters: Partial<FiltersState> = {}, mutations: RootState['listings']['mutations'] = []): RootState {
  const { listings } = loadedState(rows);
  return {
    listings: { ...listings, mutations },
    filters: { ...initialFilters, ...filters },
    selection: { ids: {} },
  };
}

const ids = (list: Listing[]) => list.map((row) => row.id);

describe('filtros', () => {
  it('busca ignora acento e caixa', () => {
    expect(ids(selectFilteredListings(state({ search: 'CAFE' })))).toEqual(['AN-1']);
    expect(ids(selectFilteredListings(state({ search: 'sofa' })))).toEqual(['AN-5']);
  });

  it('busca aceita vários termos em qualquer ordem e em campos diferentes', () => {
    expect(ids(selectFilteredListings(state({ search: '29 bicicleta curitiba' })))).toEqual(['AN-2']);
    expect(ids(selectFilteredListings(state({ search: 'bicicleta santos' })))).toEqual([]);
  });

  it('busca também pelo código e por cidade', () => {
    expect(ids(selectFilteredListings(state({ search: 'an-4' })))).toEqual(['AN-4']);
    expect(ids(selectFilteredListings(state({ search: 'vitoria' })))).toEqual(['AN-1', 'AN-4']);
  });

  it('filtra por status e categoria', () => {
    expect(ids(selectFilteredListings(state({ status: 'ativo' })))).toEqual(['AN-1', 'AN-3']);
    expect(ids(selectFilteredListings(state({ category: 'Esportes' })))).toEqual(['AN-2']);
  });

  it('a faixa de preço inclui os dois limites', () => {
    expect(ids(selectFilteredListings(state({ priceMinCents: 80_000, priceMaxCents: 150_000 })))).toEqual(['AN-1', 'AN-2', 'AN-5']);
    expect(ids(selectFilteredListings(state({ priceMinCents: 200_000, priceMaxCents: 100 })))).toEqual([]);
  });

  it('combina todos os filtros', () => {
    expect(ids(selectFilteredListings(state({ search: 'bicicleta', status: 'ativo', priceMaxCents: 50_000 })))).toEqual(['AN-3']);
  });

  it('as contagens das abas respeitam os outros filtros, mas não o próprio status', () => {
    const counts = selectStatusCounts(state({ search: 'bicicleta', status: 'vendido' }));
    expect(counts).toEqual({ todos: 2, ativo: 1, pausado: 1, expirado: 0, vendido: 0 });
  });

  it('detecta filtro ativo sem contar espaço em branco', () => {
    expect(selectHasActiveFilters(state({ search: '   ' }))).toBe(false);
    expect(selectHasActiveFilters(state({ priceMinCents: 0 }))).toBe(true);
  });
});

describe('ordenação', () => {
  it('ordena preço nas duas direções, com o id desempatando', () => {
    expect(ids(selectSortedListings(state({ sortKey: 'preco', sortDir: 'desc' })))).toEqual(['AN-4', 'AN-2', 'AN-5', 'AN-1', 'AN-3']);
    expect(ids(selectSortedListings(state({ sortKey: 'preco', sortDir: 'asc' })))).toEqual(['AN-3', 'AN-1', 'AN-2', 'AN-5', 'AN-4']);
  });

  it('título segue a ordem do português e entende números', () => {
    const titles = selectSortedListings(state({ sortKey: 'titulo', sortDir: 'asc' })).map((row) => row.title);
    expect(titles).toEqual(['Apartamento 2 quartos', 'Bicicleta aro 16', 'Bicicleta aro 29', 'Café expresso automático', 'Sofá retrátil']);
  });
});

describe('paginação', () => {
  it('fatia a página pedida', () => {
    const s = state({ pageSize: 2, page: 2, sortKey: 'preco', sortDir: 'asc' });
    expect(ids(selectPageRows(s))).toEqual(['AN-2', 'AN-5']);
    expect(selectPageInfo(s)).toMatchObject({ page: 2, total: 5, totalPages: 3, startIndex: 2, endIndex: 4 });
  });

  it('não deixa a página passar do fim quando o resultado encolhe', () => {
    const s = state({ pageSize: 2, page: 9 });
    expect(selectPageInfo(s).page).toBe(3);
    expect(selectPageRows(s)).toHaveLength(1);
  });

  it('sem resultados continua com uma página válida', () => {
    expect(selectPageInfo(state({ search: 'nada disso' }))).toMatchObject({ page: 1, totalPages: 1, total: 0, startIndex: 0, endIndex: 0 });
  });
});

describe('resumo da conta', () => {
  it('soma a conta inteira, sem depender dos filtros', () => {
    const expected = { total: 5, activeCount: 2, activeValueCents: 120_000, views: 1350, contacts: 53 };
    expect(selectAccountSummary(state())).toMatchObject(expected);
    expect(selectAccountSummary(state({ search: 'sofa', status: 'expirado' }))).toMatchObject(expected);
    expect(selectAccountSummary(state()).rate).toBeCloseTo(53 / 1350);
  });
});

describe('alterações pendentes por cima dos dados confirmados', () => {
  it('aplica na ordem de envio e não toca nos demais', () => {
    const merged = selectListings(
      state({}, [
        { requestId: 'r1', ids: ['AN-1'], patch: { priceCents: 1000, title: 'Primeiro título' } },
        { requestId: 'r2', ids: ['AN-1', 'AN-2'], patch: { priceCents: 2000 } },
      ]),
    );
    expect(merged[0]).toMatchObject({ priceCents: 2000, title: 'Primeiro título' });
    expect(merged[1]).toMatchObject({ priceCents: 2000 });
    expect(merged[2]).toBe(rows[2]);
  });

  it('filtros e resumo enxergam o valor otimista', () => {
    const s = state({ status: 'pausado' }, [{ requestId: 'r', ids: ['AN-1'], patch: { status: 'pausado' } }]);
    expect(ids(selectFilteredListings(s))).toEqual(['AN-1', 'AN-2']);
    expect(selectAccountSummary(s).activeCount).toBe(1);
    expect(selectPendingIds(s)).toEqual(new Set(['AN-1']));
  });
});

describe('plano de ações em lote', () => {
  it('conta só os selecionados elegíveis para cada ação', () => {
    const s = { ...state(), selection: { ids: { 'AN-1': true, 'AN-2': true, 'AN-4': true, sumiu: true } } } as RootState;
    expect(selectBulkPlan(s)).toEqual({ pausar: ['AN-1'], reativar: ['AN-2'], vender: ['AN-1', 'AN-2'] });
  });
});

describe('memoização', () => {
  const store = createAppStore(quietApi(rows), loadedState(rows));

  beforeEach(() => {
    selectFilteredExceptStatus.resetRecomputations();
    selectSortedListings.resetRecomputations();
    selectPageRows.resetRecomputations();
    selectFilteredExceptStatus(store.getState());
    selectSortedListings(store.getState());
    selectPageRows(store.getState());
    selectFilteredExceptStatus.resetRecomputations();
    selectSortedListings.resetRecomputations();
    selectPageRows.resetRecomputations();
  });

  it('trocar de página não refiltra nem reordena', () => {
    store.dispatch(pageChanged(2));
    selectPageRows(store.getState());
    expect(selectFilteredExceptStatus.recomputations()).toBe(0);
    expect(selectSortedListings.recomputations()).toBe(0);
    expect(selectPageRows.recomputations()).toBe(1);
    store.dispatch(pageChanged(1));
  });

  it('reordenar não refiltra', () => {
    store.dispatch(sortToggled('preco'));
    selectPageRows(store.getState());
    expect(selectFilteredExceptStatus.recomputations()).toBe(0);
    expect(selectSortedListings.recomputations()).toBe(1);
  });

  it('trocar de aba não refaz a busca de texto', () => {
    store.dispatch(statusChanged('ativo'));
    selectPageRows(store.getState());
    expect(selectFilteredExceptStatus.recomputations()).toBe(0);
    store.dispatch(statusChanged('todos'));
  });

  it('marcar uma linha não recalcula a lista e devolve a mesma referência', () => {
    const before = selectPageRows(store.getState());
    store.dispatch(rowToggled('AN-1'));
    expect(selectPageRows(store.getState())).toBe(before);
    expect(selectPageRows.recomputations()).toBe(0);
  });
});
