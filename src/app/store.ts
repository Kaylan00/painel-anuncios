import { combineReducers, configureStore } from '@reduxjs/toolkit';
import type { ListingsApi } from '../api/fakeApi';
import filtersReducer from '../features/listings/model/filtersSlice';
import listingsReducer from '../features/listings/model/listingsSlice';
import selectionReducer from '../features/listings/model/selectionSlice';

const rootReducer = combineReducers({
  listings: listingsReducer,
  filters: filtersReducer,
  selection: selectionReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export interface ThunkExtra {
  api: ListingsApi;
}

/** Fábrica em vez de singleton: cada teste ganha a própria store com a própria API. */
export function createAppStore(api: ListingsApi, preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault({
        thunk: { extraArgument: { api } satisfies ThunkExtra },
        // As verificações de dev percorrem o estado inteiro a cada ação. Com 1.000
        // anúncios isso aparece no profiler e não diz nada sobre o app em produção.
        immutableCheck: { warnAfter: 200 },
        serializableCheck: { warnAfter: 200 },
      }),
    ...(preloadedState ? { preloadedState } : {}),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];
