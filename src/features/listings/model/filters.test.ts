import { describe, expect, it } from 'vitest';
import reducer, {
  categoryChanged,
  filtersCleared,
  initialFilters,
  pageChanged,
  pageSizeChanged,
  priceRangeChanged,
  searchChanged,
  sortToggled,
  statusChanged,
} from './filtersSlice';
import selectionReducer, { rowToggled, rowsSelected, selectionCleared } from './selectionSlice';
import { canApply, canTransition, eligibleIds } from './statusRules';
import { makeListing } from '../../../test/utils';

describe('filtersSlice', () => {
  const onPage5 = { ...initialFilters, page: 5 };

  it.each([
    ['busca', searchChanged('x')],
    ['status', statusChanged('pausado')],
    ['categoria', categoryChanged('Moda')],
    ['preço', priceRangeChanged({ min: 100 })],
    ['ordenação', sortToggled('preco')],
    ['tamanho da página', pageSizeChanged(50)],
  ])('mudar %s volta para a página 1', (_, action) => {
    expect(reducer(onPage5, action).page).toBe(1);
  });

  it('atualiza só o limite de preço enviado e aceita limpar com null', () => {
    const withMin = reducer(initialFilters, priceRangeChanged({ min: 1000 }));
    const withBoth = reducer(withMin, priceRangeChanged({ max: 5000 }));
    expect(withBoth).toMatchObject({ priceMinCents: 1000, priceMaxCents: 5000 });
    expect(reducer(withBoth, priceRangeChanged({ min: null }))).toMatchObject({ priceMinCents: null, priceMaxCents: 5000 });
  });

  it('coluna nova usa a direção natural dela; o segundo clique inverte e o terceiro volta ao padrão', () => {
    const byTitle = reducer(initialFilters, sortToggled('titulo'));
    expect(byTitle).toMatchObject({ sortKey: 'titulo', sortDir: 'asc' });
    const inverted = reducer(byTitle, sortToggled('titulo'));
    expect(inverted).toMatchObject({ sortKey: 'titulo', sortDir: 'desc' });
    expect(reducer(inverted, sortToggled('titulo'))).toMatchObject({ sortKey: 'recentes', sortDir: 'desc' });
    expect(reducer(byTitle, sortToggled('preco'))).toMatchObject({ sortKey: 'preco', sortDir: 'desc' });
  });

  it('limpar filtros preserva ordenação e tamanho da página', () => {
    const state = { ...initialFilters, search: 'x', status: 'vendido', sortKey: 'preco', sortDir: 'asc', pageSize: 100, page: 3 } as const;
    expect(reducer(state, filtersCleared())).toEqual({ ...initialFilters, sortKey: 'preco', sortDir: 'asc', pageSize: 100 });
  });
});

describe('selectionSlice', () => {
  const two = { ids: { A: true, B: true } } as const;

  it('alterna uma linha', () => {
    const on = selectionReducer({ ids: {} }, rowToggled('A'));
    expect(on.ids).toEqual({ A: true });
    expect(selectionReducer(on, rowToggled('A')).ids).toEqual({});
  });

  it('seleciona e desmarca em grupo sem afetar as demais', () => {
    expect(selectionReducer({ ids: { Z: true } }, rowsSelected({ ids: ['A', 'B'], selected: true })).ids).toEqual({ Z: true, A: true, B: true });
    expect(selectionReducer(two, rowsSelected({ ids: ['A'], selected: false })).ids).toEqual({ B: true });
    expect(selectionReducer(two, selectionCleared()).ids).toEqual({});
  });

  it.each([
    ['busca', searchChanged('x')],
    ['status', statusChanged('ativo')],
    ['categoria', categoryChanged('Moda')],
    ['preço', priceRangeChanged({ max: 10 })],
    ['limpar', filtersCleared()],
  ])('filtro de %s limpa a seleção, para o lote não atingir linha invisível', (_, action) => {
    expect(selectionReducer(two, action).ids).toEqual({});
  });

  it.each([
    ['página', pageChanged(2)],
    ['ordenação', sortToggled('preco')],
    ['tamanho da página', pageSizeChanged(100)],
  ])('mudar %s mantém a seleção', (_, action) => {
    expect(selectionReducer(two, action).ids).toEqual(two.ids);
  });
});

describe('statusRules', () => {
  it('define as transições permitidas', () => {
    expect(canApply('pausar', 'ativo')).toBe(true);
    expect(canApply('pausar', 'expirado')).toBe(false);
    expect(canApply('reativar', 'expirado')).toBe(true);
    expect(canApply('reativar', 'vendido')).toBe(false);
    expect(canApply('vender', 'vendido')).toBe(false);
  });

  it('vendido é estado final', () => {
    expect(canTransition('vendido', 'ativo')).toBe(false);
    expect(canTransition('vendido', 'pausado')).toBe(false);
    expect(canTransition('ativo', 'pausado')).toBe(true);
    // Nenhuma ação leva um anúncio para expirado: quem expira é o prazo.
    expect(canTransition('ativo', 'expirado')).toBe(false);
  });

  it('filtra só os anúncios elegíveis', () => {
    const rows = [makeListing({ id: 'A' }), makeListing({ id: 'P', status: 'pausado' }), makeListing({ id: 'V', status: 'vendido' })];
    expect(eligibleIds('pausar', rows)).toEqual(['A']);
    expect(eligibleIds('reativar', rows)).toEqual(['P']);
    expect(eligibleIds('vender', rows)).toEqual(['A', 'P']);
  });
});
