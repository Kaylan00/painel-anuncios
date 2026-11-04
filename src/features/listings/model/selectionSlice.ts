import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { categoryChanged, filtersCleared, priceRangeChanged, searchChanged, statusChanged } from './filtersSlice';

export interface SelectionState {
  /** Objeto em vez de array: a consulta por linha fica O(1) e o estado continua serializável. */
  ids: Record<string, true>;
}

const initialState: SelectionState = { ids: {} };

const selectionSlice = createSlice({
  name: 'selection',
  initialState,
  reducers: {
    rowToggled(state, action: PayloadAction<string>) {
      if (state.ids[action.payload]) delete state.ids[action.payload];
      else state.ids[action.payload] = true;
    },
    rowsSelected(state, action: PayloadAction<{ ids: string[]; selected: boolean }>) {
      for (const id of action.payload.ids) {
        if (action.payload.selected) state.ids[id] = true;
        else delete state.ids[id];
      }
    },
    selectionCleared(state) {
      state.ids = {};
    },
  },
  extraReducers: (builder) => {
    // Filtro novo limpa a seleção: uma ação em lote nunca pode atingir linha que saiu da tela.
    builder.addMatcher(
      isAnyOf(searchChanged, statusChanged, categoryChanged, priceRangeChanged, filtersCleared),
      (state) => {
        state.ids = {};
      },
    );
  },
});

export const { rowToggled, rowsSelected, selectionCleared } = selectionSlice.actions;
export default selectionSlice.reducer;
