import { useCallback } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { useToast } from '../../contexts/ToastContext';
import { bulkChangeStatus, saveListing } from './model/listingsSlice';
import type { ApiFailure } from './model/listingsSlice';
import { selectionCleared } from './model/selectionSlice';
import { BULK_RULES } from './model/statusRules';
import type { BulkAction } from './model/statusRules';
import type { ListingEdit } from './model/types';

const DONE: Record<BulkAction, [singular: string, plural: string]> = {
  pausar: ['pausado', 'pausados'],
  reativar: ['reativado', 'reativados'],
  vender: ['marcado como vendido', 'marcados como vendidos'],
};

const VERB: Record<BulkAction, string> = {
  pausar: 'pausar',
  reativar: 'reativar',
  vender: 'marcar como vendido',
};

const plural = (count: number) => (count === 1 ? `1 anúncio` : `${count} anúncios`);

/** Liga as duas pontas: dispara a ação da store e conta o desfecho ao usuário. */
export function useListingActions() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();

  const runBulk = useCallback(
    async function run(action: BulkAction, ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      dispatch(selectionCleared());
      const retry = { label: 'Tentar de novo', onClick: () => void run(action, ids) };
      try {
        const result = await dispatch(bulkChangeStatus({ ids, status: BULK_RULES[action].to })).unwrap();
        const done = result.updated.length;
        const failed = result.failed.map((item) => item.id);
        if (failed.length === 0) {
          notify({ tone: 'sucesso', message: `${plural(done)} ${DONE[action][done === 1 ? 0 : 1]}.` });
        } else {
          notify({
            tone: 'aviso',
            message: `${done} de ${ids.length} deram certo. ${plural(failed.length)} ${failed.length === 1 ? 'voltou' : 'voltaram'} ao status anterior.`,
            action: { label: 'Tentar de novo', onClick: () => void run(action, failed) },
          });
        }
      } catch (error) {
        const reason = (error as ApiFailure).message;
        notify({ tone: 'erro', message: `Não deu para ${VERB[action]} ${plural(ids.length)}. ${reason} Nada mudou.`, action: retry });
      }
    },
    [dispatch, notify],
  );

  const save = useCallback(
    async function run(id: string, changes: ListingEdit): Promise<void> {
      try {
        await dispatch(saveListing({ id, changes })).unwrap();
        notify({ tone: 'sucesso', message: `${id} salvo.` });
      } catch (error) {
        const failure = error as ApiFailure;
        const canRetry = failure.code === 'network' || failure.code === 'server';
        notify({
          tone: 'erro',
          message: `Não deu para salvar ${id}. ${failure.message} Os valores anteriores voltaram.`,
          ...(canRetry ? { action: { label: 'Tentar de novo', onClick: () => void run(id, changes) } } : {}),
        });
      }
    },
    [dispatch, notify],
  );

  return { runBulk, save };
}
