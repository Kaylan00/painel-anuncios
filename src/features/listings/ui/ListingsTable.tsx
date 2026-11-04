import { memo, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { contactRate, formatBRL, formatDate, formatInt, formatPercent } from '../../../lib/format';
import { sortToggled } from '../model/filtersSlice';
import type { SortKey } from '../model/filtersSlice';
import type { Listing } from '../model/types';
import { StatusText } from './StatusText';

export interface RowProps {
  listing: Listing;
  selected: boolean;
  pending: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

/** Memoizada: marcar uma caixa renderiza uma linha, não a página inteira. */
export const ListingRow = memo(function ListingRow({ listing, selected, pending, onToggle, onOpen }: RowProps) {
  return (
    <tr className={selected ? 'is-selected' : undefined} aria-busy={pending}>
      <td className="cell-check">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Selecionar ${listing.title}`}
          onChange={() => onToggle(listing.id)}
        />
      </td>
      <td className="cell-title">
        <button type="button" className="link" onClick={() => onOpen(listing.id)}>
          {listing.title}
        </button>
        <span className="muted">
          {listing.id} · {listing.city}/{listing.uf}
        </span>
      </td>
      <td className="muted">{listing.category}</td>
      <td className="num">{formatBRL(listing.priceCents)}</td>
      <td>
        <StatusText status={listing.status} />
        {pending && <span className="saving">salvando</span>}
      </td>
      <td className="num">{formatInt(listing.views)}</td>
      <td className="num">{formatInt(listing.contacts)}</td>
      <td className="num muted">{formatPercent(contactRate(listing.views, listing.contacts))}</td>
      <td className="num muted">{formatDate(listing.expiresAt)}</td>
    </tr>
  );
});

const COLUMNS: Array<{ label: string; key?: SortKey; numeric?: boolean; className?: string }> = [
  { label: 'Anúncio', key: 'titulo' },
  { label: 'Categoria', className: 'col-category' },
  { label: 'Preço', key: 'preco', numeric: true, className: 'col-price' },
  { label: 'Status', className: 'col-status' },
  { label: 'Visualiz.', key: 'visualizacoes', numeric: true, className: 'col-metric' },
  { label: 'Contatos', key: 'contatos', numeric: true, className: 'col-metric' },
  { label: 'Taxa', numeric: true, className: 'col-rate' },
  { label: 'Vence', key: 'expira', numeric: true, className: 'col-date' },
];

interface TableProps {
  rows: Listing[];
  selection: Record<string, true>;
  pendingIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

export function ListingsTable({
  rows,
  selection,
  pendingIds,
  allSelected,
  someSelected,
  onToggleAll,
  onToggle,
  onOpen,
}: TableProps) {
  const dispatch = useAppDispatch();
  const sortKey = useAppSelector((state) => state.filters.sortKey);
  const sortDir = useAppSelector((state) => state.filters.sortDir);
  const headerCheck = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (headerCheck.current) headerCheck.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  return (
    <table className="table">
      <thead>
        <tr>
          <th className="cell-check" scope="col">
            <input
              ref={headerCheck}
              type="checkbox"
              checked={allSelected}
              aria-label="Selecionar todos desta página"
              onChange={onToggleAll}
            />
          </th>
          {COLUMNS.map((column) => {
            const active = column.key !== undefined && column.key === sortKey;
            const sort = active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined;
            return (
              <th
                key={column.label}
                scope="col"
                className={[column.className, column.numeric ? 'num' : ''].filter(Boolean).join(' ') || undefined}
                aria-sort={sort}
              >
                {column.key ? (
                  <button type="button" className="th-sort" onClick={() => dispatch(sortToggled(column.key!))}>
                    {column.label}
                    <span aria-hidden="true">{active ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((listing) => (
          <ListingRow
            key={listing.id}
            listing={listing}
            selected={selection[listing.id] === true}
            pending={pendingIds.has(listing.id)}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}
      </tbody>
    </table>
  );
}
