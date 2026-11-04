import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { formatInt } from '../../../lib/format';
import { statusChanged } from '../model/filtersSlice';
import type { FiltersState } from '../model/filtersSlice';
import { selectStatusCounts } from '../model/selectors';

const TABS: Array<{ value: FiltersState['status']; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativo', label: 'Ativos' },
  { value: 'pausado', label: 'Pausados' },
  { value: 'expirado', label: 'Expirados' },
  { value: 'vendido', label: 'Vendidos' },
];

export function StatusTabs() {
  const dispatch = useAppDispatch();
  const current = useAppSelector((state) => state.filters.status);
  const counts = useAppSelector(selectStatusCounts);
  return (
    <div className="tabs" role="group" aria-label="Filtrar por status">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className="tabs__item"
          aria-pressed={current === tab.value}
          onClick={() => dispatch(statusChanged(tab.value))}
        >
          {tab.label} <span className="tabs__count">{formatInt(counts[tab.value])}</span>
        </button>
      ))}
    </div>
  );
}
