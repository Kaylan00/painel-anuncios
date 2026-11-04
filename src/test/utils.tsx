import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { ApiError, createFakeApi } from '../api/fakeApi';
import type { BulkResult, FakeApi, FakeApiOptions } from '../api/fakeApi';
import { createAppStore } from '../app/store';
import type { RootState } from '../app/store';
import { ToastViewport } from '../components/ToastViewport';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import listingsReducer, { listingsAdapter } from '../features/listings/model/listingsSlice';
import type { Listing, ListingEdit } from '../features/listings/model/types';

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'AN-1',
    title: 'Notebook 15 polegadas',
    category: 'Eletrônicos',
    priceCents: 250_000,
    status: 'ativo',
    city: 'Vitória',
    uf: 'ES',
    createdAt: '2026-10-01T12:00:00.000Z',
    expiresAt: '2026-11-30T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    views: 1000,
    contacts: 20,
    viewsLast14Days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    version: 1,
    ...overrides,
  };
}

/** Estado inicial da store já com os anúncios carregados. */
export function loadedState(rows: Listing[]): Pick<RootState, 'listings'> {
  const initial = listingsReducer(undefined, { type: '@@init' });
  return { listings: { ...listingsAdapter.setAll(initial, rows), loadStatus: 'ready' } };
}

/** API falsa sem latência nem sorte, para o teste decidir o que acontece. */
export function quietApi(rows: Listing[], options: FakeApiOptions = {}): FakeApi {
  return createFakeApi({
    minLatencyMs: 0,
    maxLatencyMs: 0,
    failureRate: 0,
    itemFailureRate: 0,
    loadSeed: async () => structuredClone(rows),
    ...options,
  });
}

interface Deferred<T> {
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  args: unknown[];
}

/**
 * API cujas respostas o teste libera na mão, em qualquer ordem. É o único jeito
 * confiável de reproduzir resposta fora de ordem e de olhar a tela no meio do caminho.
 */
export function controlledApi(rows: Listing[] = []) {
  const updates: Array<Deferred<Listing>> = [];
  const bulks: Array<Deferred<BulkResult>> = [];
  const api: FakeApi = {
    fetchListings: async () => structuredClone(rows),
    updateListing: (...args: [string, ListingEdit]) =>
      new Promise<Listing>((resolve, reject) => updates.push({ resolve, reject, args })),
    bulkUpdateStatus: (...args: [string[], Listing['status']]) =>
      new Promise<BulkResult>((resolve, reject) => bulks.push({ resolve, reject, args })),
    configure: () => {},
    getConfig: () => ({ minLatencyMs: 0, maxLatencyMs: 0, failureRate: 0, itemFailureRate: 0 }),
  };
  return { api, updates, bulks };
}

export const serverError = () => new ApiError('server', 'O servidor retornou um erro inesperado.');

export function setViewport(kind: 'desktop' | 'mobile') {
  const matches = (query: string) => (query.includes('min-width: 900px') ? kind === 'desktop' : false);
  window.matchMedia = ((query: string) => ({
    matches: matches(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

interface RenderOptions {
  api?: FakeApi;
  rows?: Listing[];
}

export function renderWithProviders(ui: ReactNode, { rows = [], api = quietApi(rows) }: RenderOptions = {}) {
  const store = createAppStore(api, loadedState(rows));
  const tree = (node: ReactNode) => (
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          {node}
          <ToastViewport />
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
  const result = render(tree(ui));
  /** Renderiza de novo com outras props, mantendo a mesma árvore e a mesma store. */
  const rerenderUi = (node: ReactNode) => result.rerender(tree(node));
  return { store, api, rerenderUi, ...result };
}
