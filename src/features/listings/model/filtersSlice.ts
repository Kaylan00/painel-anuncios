import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Category, ListingStatus } from './types';

export type SortKey = 'recentes' | 'titulo' | 'preco' | 'visualizacoes' | 'contatos' | 'expira';
export type SortDir = 'asc' | 'desc';
export const PAGE_SIZES = [25, 50, 100] as const;

export interface FiltersState {
  search: string;
  status: ListingStatus | 'todos';
  category: Category | 'todas';
  priceMinCents: number | null;
  priceMaxCents: number | null;
  sortKey: SortKey;
  sortDir: SortDir;
  page: number;
  pageSize: number;
}

export const initialFilters: FiltersState = {
  search: '',
  status: 'todos',
  category: 'todas',
  priceMinCents: null,
  priceMaxCents: null,
  sortKey: 'recentes',
  sortDir: 'desc',
  page: 1,
  pageSize: 25,
};

/** Direção natural ao escolher cada coluna: texto de A a Z, número do maior para o menor. */
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  recentes: 'desc',
  titulo: 'asc',
  preco: 'desc',
  visualizacoes: 'desc',
  contatos: 'desc',
  expira: 'asc',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState: initialFilters,
  reducers: {
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page = 1;
    },
    statusChanged(state, action: PayloadAction<FiltersState['status']>) {
      state.status = action.payload;
      state.page = 1;
    },
    categoryChanged(state, action: PayloadAction<FiltersState['category']>) {
      state.category = action.payload;
      state.page = 1;
    },
    priceRangeChanged(state, action: PayloadAction<{ min?: number | null; max?: number | null }>) {
      if (action.payload.min !== undefined) state.priceMinCents = action.payload.min;
      if (action.payload.max !== undefined) state.priceMaxCents = action.payload.max;
      state.page = 1;
    },
    /**
     * Ciclo de três cliques numa coluna: direção natural, invertida e de volta à
     * ordem padrão. Sem o terceiro passo, não haveria como voltar para "mais recentes".
     */
    sortToggled(state, action: PayloadAction<SortKey>) {
      const key = action.payload;
      if (state.sortKey !== key) {
        state.sortKey = key;
        state.sortDir = DEFAULT_DIR[key];
      } else if (state.sortDir === DEFAULT_DIR[key]) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = initialFilters.sortKey;
        state.sortDir = initialFilters.sortDir;
      }
      state.page = 1;
    },
    pageChanged(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    pageSizeChanged(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
      state.page = 1;
    },
    filtersCleared(state) {
      return { ...initialFilters, sortKey: state.sortKey, sortDir: state.sortDir, pageSize: state.pageSize };
    },
  },
});

export const {
  searchChanged,
  statusChanged,
  categoryChanged,
  priceRangeChanged,
  sortToggled,
  pageChanged,
  pageSizeChanged,
  filtersCleared,
} = filtersSlice.actions;
export default filtersSlice.reducer;
