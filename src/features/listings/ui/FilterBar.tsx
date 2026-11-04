import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  categoryChanged,
  filtersCleared,
  priceRangeChanged,
  searchChanged,
  sortToggled,
} from '../model/filtersSlice';
import type { FiltersState, SortKey } from '../model/filtersSlice';
import { selectHasActiveFilters } from '../model/selectors';
import { CATEGORIES } from '../model/types';

/** O campo trabalha em reais inteiros e a store guarda centavos. */
const toCents = (text: string) => {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? null : Number(digits) * 100;
};
const toText = (cents: number | null) => (cents === null ? '' : String(cents / 100));

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'recentes', label: 'Mais recentes' },
  { key: 'titulo', label: 'Título' },
  { key: 'preco', label: 'Preço' },
  { key: 'visualizacoes', label: 'Visualizações' },
  { key: 'contatos', label: 'Contatos' },
  { key: 'expira', label: 'Vencimento' },
];

export function FilterBar({ compact }: { compact: boolean }) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.filters);
  const hasFilters = useAppSelector(selectHasActiveFilters);
  const [expanded, setExpanded] = useState(false);

  const { priceMinCents: min, priceMaxCents: max } = filters;
  const rangeInverted = min !== null && max !== null && min > max;
  const showDetails = !compact || expanded;
  const detailCount = (filters.category !== 'todas' ? 1 : 0) + (min !== null || max !== null ? 1 : 0);

  return (
    <search className="filters">
      <div className="filters__main">
        <label className="field field--grow">
          <span className="field__label">Buscar</span>
          <input
            type="search"
            value={filters.search}
            placeholder="Título, código ou cidade"
            onChange={(event) => dispatch(searchChanged(event.target.value))}
          />
        </label>
        {compact && (
          <button type="button" className="btn" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>
            Filtros{detailCount > 0 ? ` (${detailCount})` : ''}
          </button>
        )}
      </div>

      {showDetails && (
        <div className="filters__details">
          <label className="field">
            <span className="field__label">Categoria</span>
            <select
              value={filters.category}
              onChange={(event) => dispatch(categoryChanged(event.target.value as FiltersState['category']))}
            >
              <option value="todas">Todas</option>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <div className="field-pair">
            <label className="field">
              <span className="field__label">Preço de (R$)</span>
              <input
                inputMode="numeric"
                value={toText(min)}
                aria-invalid={rangeInverted}
                onChange={(event) => dispatch(priceRangeChanged({ min: toCents(event.target.value) }))}
              />
            </label>
            <label className="field">
              <span className="field__label">até (R$)</span>
              <input
                inputMode="numeric"
                value={toText(max)}
                aria-invalid={rangeInverted}
                onChange={(event) => dispatch(priceRangeChanged({ max: toCents(event.target.value) }))}
              />
            </label>
          </div>

          {compact && (
            <label className="field">
              <span className="field__label">Ordenar por</span>
              <select
                value={filters.sortKey}
                onChange={(event) => dispatch(sortToggled(event.target.value as SortKey))}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {hasFilters && (
            <button type="button" className="btn btn--text filters__clear" onClick={() => dispatch(filtersCleared())}>
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {rangeInverted && (
        <p className="field__error" role="alert">
          O preço mínimo está acima do máximo.
        </p>
      )}
    </search>
  );
}
