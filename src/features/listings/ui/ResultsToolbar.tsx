import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { formatInt } from '../../../lib/format';
import {
  selectBulkPlan,
  selectFilteredListings,
  selectLoadStatus,
  selectPageInfo,
  selectSelectedIds,
} from '../model/selectors';
import { rowsSelected, selectionCleared } from '../model/selectionSlice';
import { useListingActions } from '../useListingActions';

/**
 * Linha fixa logo acima da lista: mostra quantos resultados há e vira a barra de ações
 * quando existe seleção. No celular as ações descem para a base da tela, ao alcance do polegar.
 */
export function ResultsToolbar({ pageIds, allOnPageSelected }: { pageIds: string[]; allOnPageSelected: boolean }) {
  const dispatch = useAppDispatch();
  const { runBulk } = useListingActions();
  const ready = useAppSelector(selectLoadStatus) === 'ready';
  const info = useAppSelector(selectPageInfo);
  const plan = useAppSelector(selectBulkPlan);
  const selectedIds = useAppSelector(selectSelectedIds);
  const filtered = useAppSelector(selectFilteredListings);
  const [confirmingSale, setConfirmingSale] = useState(false);

  const count = selectedIds.length;
  const canSelectAll = allOnPageSelected && count < info.total && count === pageIds.length;

  return (
    <div className="toolbar">
      <div className="toolbar__count" aria-live="polite">
        {!ready ? (
          <span className="muted">Carregando anúncios</span>
        ) : count === 0 ? (
          <span>
            {formatInt(info.total)} {info.total === 1 ? 'resultado' : 'resultados'}
          </span>
        ) : (
          <>
            <strong>
              {formatInt(count)} {count === 1 ? 'selecionado' : 'selecionados'}
            </strong>
            {canSelectAll && (
              <button
                type="button"
                className="btn btn--text"
                onClick={() => dispatch(rowsSelected({ ids: filtered.map((row) => row.id), selected: true }))}
              >
                Selecionar os {formatInt(info.total)}
              </button>
            )}
          </>
        )}
      </div>

      {count > 0 && (
        <div className="toolbar__actions" role="group" aria-label="Ações em lote">
          {confirmingSale ? (
            <>
              <span className="toolbar__question">
                Marcar {formatInt(plan.vender.length)} como vendido? Não dá para desfazer.
              </span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setConfirmingSale(false);
                  void runBulk('vender', plan.vender);
                }}
              >
                Confirmar
              </button>
              <button type="button" className="btn" onClick={() => setConfirmingSale(false)}>
                Voltar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn"
                disabled={plan.pausar.length === 0}
                onClick={() => void runBulk('pausar', plan.pausar)}
              >
                Pausar ({formatInt(plan.pausar.length)})
              </button>
              <button
                type="button"
                className="btn"
                disabled={plan.reativar.length === 0}
                onClick={() => void runBulk('reativar', plan.reativar)}
              >
                Reativar ({formatInt(plan.reativar.length)})
              </button>
              <button
                type="button"
                className="btn"
                disabled={plan.vender.length === 0}
                onClick={() => setConfirmingSale(true)}
              >
                Vendido ({formatInt(plan.vender.length)})
              </button>
              <button type="button" className="btn btn--text" onClick={() => dispatch(selectionCleared())}>
                Limpar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
