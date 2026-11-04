import { memo } from 'react';
import { formatBRL, formatDate, formatInt } from '../../../lib/format';
import type { Listing } from '../model/types';
import { StatusText } from './StatusText';
import type { RowProps } from './ListingsTable';

const ListingItem = memo(function ListingItem({ listing, selected, pending, onToggle, onOpen }: RowProps) {
  return (
    <li className={selected ? 'item is-selected' : 'item'} aria-busy={pending}>
      <label className="item__check">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Selecionar ${listing.title}`}
          onChange={() => onToggle(listing.id)}
        />
      </label>
      <div className="item__body">
        <button type="button" className="item__title" onClick={() => onOpen(listing.id)}>
          {listing.title}
        </button>
        <div className="item__line">
          <strong className="tabular">{formatBRL(listing.priceCents)}</strong>
          <StatusText status={listing.status} />
          {pending && <span className="saving">salvando</span>}
        </div>
        <div className="item__line muted tabular">
          <span>{formatInt(listing.views)} visualiz.</span>
          <span>
            {formatInt(listing.contacts)} {listing.contacts === 1 ? 'contato' : 'contatos'}
          </span>
          <span>vence {formatDate(listing.expiresAt)}</span>
        </div>
      </div>
    </li>
  );
});

interface ListProps {
  rows: Listing[];
  selection: Record<string, true>;
  pendingIds: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

export function ListingsList({ rows, selection, pendingIds, onToggle, onOpen }: ListProps) {
  return (
    <ul className="list">
      {rows.map((listing) => (
        <ListingItem
          key={listing.id}
          listing={listing}
          selected={selection[listing.id] === true}
          pending={pendingIds.has(listing.id)}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </ul>
  );
}
