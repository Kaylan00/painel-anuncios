import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { filtersCleared } from '../model/filtersSlice';
import { fetchListings } from '../model/listingsSlice';
import {
  selectHasActiveFilters,
  selectLoadError,
  selectLoadStatus,
  selectPageRows,
  selectPendingIds,
  selectSelectionMap,
} from '../model/selectors';
import { rowToggled, rowsSelected } from '../model/selectionSlice';
import { AccountSummary } from './AccountSummary';
import { FilterBar } from './FilterBar';
import { ListingsList } from './ListingsList';
import { ListingsTable } from './ListingsTable';
import { Pagination } from './Pagination';
import { ResultsToolbar } from './ResultsToolbar';
import { StatusTabs } from './StatusTabs';

const ListingPanel = lazy(() => import('./ListingPanel'));

function LoadingRows() {
  return (
    <div className="loading" role="status" aria-label="Carregando anúncios">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="loading__row" />
      ))}
    </div>
  );
}

export function ListingsPage() {
  const dispatch = useAppDispatch();
  const loadStatus = useAppSelector(selectLoadStatus);
  const loadError = useAppSelector(selectLoadError);
  const hasFilters = useAppSelector(selectHasActiveFilters);
  const selection = useAppSelector(selectSelectionMap);
  const pendingIds = useAppSelector(selectPendingIds);
  const currentRows = useAppSelector(selectPageRows);
  // A digitação atualiza o campo na hora; a lista acompanha quando o React tiver folga.
  const rows = useDeferredValue(currentRows);
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchListings());
  }, [dispatch]);

  const toggleRow = useCallback((id: string) => dispatch(rowToggled(id)), [dispatch]);
  const closePanel = useCallback(() => setOpenId(null), []);

  const pageIds = rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selection[id]).length;
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const toggleAll = () => dispatch(rowsSelected({ ids: pageIds, selected: !allOnPageSelected }));

  return (
    <main className="page">
      <div className="page__head">
        <h1>Meus anúncios</h1>
        {loadStatus === 'ready' && <AccountSummary />}
      </div>

      {loadStatus === 'failed' ? (
        <div className="state" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn btn--primary" onClick={() => void dispatch(fetchListings())}>
            Tentar de novo
          </button>
        </div>
      ) : loadStatus !== 'ready' ? (
        <LoadingRows />
      ) : (
        <>
          <StatusTabs />
          <FilterBar compact={!isDesktop} />
          <ResultsToolbar pageIds={pageIds} allOnPageSelected={allOnPageSelected} />

          {rows.length === 0 ? (
            <div className="state">
              <p>Nenhum anúncio com esses filtros.</p>
              {hasFilters && (
                <button type="button" className="btn" onClick={() => dispatch(filtersCleared())}>
                  Limpar filtros
                </button>
              )}
            </div>
          ) : isDesktop ? (
            <ListingsTable
              rows={rows}
              selection={selection}
              pendingIds={pendingIds}
              allSelected={allOnPageSelected}
              someSelected={selectedOnPage > 0}
              onToggleAll={toggleAll}
              onToggle={toggleRow}
              onOpen={setOpenId}
            />
          ) : (
            <>
              <label className="select-page">
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} />
                Selecionar esta página
              </label>
              <ListingsList
                rows={rows}
                selection={selection}
                pendingIds={pendingIds}
                onToggle={toggleRow}
                onOpen={setOpenId}
              />
            </>
          )}

          <Pagination />
        </>
      )}

      {openId !== null && (
        <Suspense fallback={null}>
          <ListingPanel key={openId} id={openId} onClose={closePanel} />
        </Suspense>
      )}
    </main>
  );
}
