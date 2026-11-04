import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '../../../api/fakeApi';
import type { ApiErrorCode, BulkResult } from '../../../api/fakeApi';
import type { RootState, ThunkExtra } from '../../../app/store';
import type { Listing, ListingEdit, ListingStatus } from './types';

export const listingsAdapter = createEntityAdapter<Listing>();

/**
 * Uma alteração enviada que o servidor ainda não respondeu. Ela não toca nos dados
 * confirmados: fica ao lado deles, e os selectors aplicam por cima na leitura.
 */
export interface PendingMutation {
  requestId: string;
  ids: string[];
  patch: Partial<Pick<Listing, 'title' | 'priceCents' | 'status'>>;
}

export interface ApiFailure {
  code: ApiErrorCode | 'unknown';
  message: string;
}

interface ListingsExtraState {
  loadStatus: 'idle' | 'loading' | 'ready' | 'failed';
  loadError: string | null;
  mutations: PendingMutation[];
}

const initialState = listingsAdapter.getInitialState<ListingsExtraState>({
  loadStatus: 'idle',
  loadError: null,
  mutations: [],
});

export type ListingsState = typeof initialState;

const createAppThunk = createAsyncThunk.withTypes<{
  state: RootState;
  extra: ThunkExtra;
  rejectValue: ApiFailure;
}>();

function toFailure(error: unknown): ApiFailure {
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  return { code: 'unknown', message: 'Erro inesperado.' };
}

export const fetchListings = createAppThunk(
  'listings/fetch',
  async (_: void, { extra, rejectWithValue }) => {
    try {
      return await extra.api.fetchListings();
    } catch (error) {
      return rejectWithValue(toFailure(error));
    }
  },
  {
    // O StrictMode roda o efeito duas vezes em dev; a segunda chamada para aqui.
    condition: (_, { getState }) => getState().listings.loadStatus !== 'loading',
  },
);

export const saveListing = createAppThunk(
  'listings/save',
  async ({ id, changes }: { id: string; changes: ListingEdit }, { extra, rejectWithValue }) => {
    try {
      return await extra.api.updateListing(id, changes);
    } catch (error) {
      return rejectWithValue(toFailure(error));
    }
  },
);

export const bulkChangeStatus = createAppThunk<BulkResult, { ids: string[]; status: ListingStatus }>(
  'listings/bulkChangeStatus',
  async ({ ids, status }, { extra, rejectWithValue }) => {
    try {
      return await extra.api.bulkUpdateStatus(ids, status);
    } catch (error) {
      return rejectWithValue(toFailure(error));
    }
  },
);

function dropMutation(state: ListingsState, requestId: string) {
  state.mutations = state.mutations.filter((mutation) => mutation.requestId !== requestId);
}

/**
 * Grava a resposta só se ela for mais nova que o dado atual. Se duas respostas
 * voltarem trocadas, a antiga não pode pisar na nova.
 */
function confirm(state: ListingsState, incoming: Listing) {
  const current = state.entities[incoming.id];
  if (!current || incoming.version > current.version) {
    listingsAdapter.upsertOne(state, incoming);
  }
}

const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchListings.pending, (state) => {
        state.loadStatus = 'loading';
        state.loadError = null;
      })
      .addCase(fetchListings.fulfilled, (state, action) => {
        listingsAdapter.setAll(state, action.payload);
        state.loadStatus = 'ready';
      })
      .addCase(fetchListings.rejected, (state, action) => {
        state.loadStatus = 'failed';
        state.loadError = action.payload?.message ?? 'Não foi possível carregar os anúncios.';
      })

      .addCase(saveListing.pending, (state, action) => {
        const { id, changes } = action.meta.arg;
        state.mutations.push({ requestId: action.meta.requestId, ids: [id], patch: changes });
      })
      .addCase(saveListing.fulfilled, (state, action) => {
        dropMutation(state, action.meta.requestId);
        confirm(state, action.payload);
      })
      // Rollback: retirar a alteração pendente basta. Os dados confirmados nunca mudaram.
      .addCase(saveListing.rejected, (state, action) => {
        dropMutation(state, action.meta.requestId);
      })

      .addCase(bulkChangeStatus.pending, (state, action) => {
        const { ids, status } = action.meta.arg;
        state.mutations.push({ requestId: action.meta.requestId, ids, patch: { status } });
      })
      .addCase(bulkChangeStatus.fulfilled, (state, action) => {
        // Sai a alteração do lote inteiro: quem o servidor confirmou entra por `updated`,
        // quem falhou volta sozinho ao valor anterior.
        dropMutation(state, action.meta.requestId);
        for (const listing of action.payload.updated) confirm(state, listing);
      })
      .addCase(bulkChangeStatus.rejected, (state, action) => {
        dropMutation(state, action.meta.requestId);
      });
  },
});

export default listingsSlice.reducer;
