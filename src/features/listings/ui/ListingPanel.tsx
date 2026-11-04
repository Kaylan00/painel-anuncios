import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { useAppSelector } from '../../../app/hooks';
import { contactRate, formatDate, formatInt, formatPercent } from '../../../lib/format';
import { selectListingsById, selectPendingIds } from '../model/selectors';
import { canApply } from '../model/statusRules';
import type { Listing, ListingEdit } from '../model/types';
import {
  TITLE_MAX,
  formatPriceInput,
  parsePriceInput,
  validatePriceCents,
  validateTitle,
} from '../model/validation';
import { useListingActions } from '../useListingActions';
import { StatusText } from './StatusText';
import { ViewsBars } from './ViewsBars';

export function EditForm({ listing, onDone }: { listing: Listing; onDone: () => void }) {
  const { save } = useListingActions();
  const [title, setTitle] = useState(listing.title);
  const [priceText, setPriceText] = useState(() => formatPriceInput(listing.priceCents));
  const [showErrors, setShowErrors] = useState({ title: false, price: false });
  const titleErrorId = useId();
  const priceErrorId = useId();

  const priceCents = parsePriceInput(priceText);
  const titleError = validateTitle(title);
  const priceError = validatePriceCents(priceCents);
  const locked = listing.status === 'vendido';

  const changes: ListingEdit = {};
  if (title.trim() !== listing.title) changes.title = title.trim();
  if (priceCents !== null && priceCents !== listing.priceCents) changes.priceCents = priceCents;
  const hasChanges = Object.keys(changes).length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (titleError || priceError) {
      setShowErrors({ title: true, price: true });
      return;
    }
    if (!hasChanges) return;
    // Fecha na hora: a tabela já mostra o valor novo, e se falhar o aviso conta e o valor antigo volta.
    onDone();
    void save(listing.id, changes);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {locked && <p className="muted">Anúncio vendido não pode mais ser editado.</p>}
      <div className="field">
        <label className="field__label" htmlFor={`${titleErrorId}-input`}>
          Título
        </label>
        <input
          id={`${titleErrorId}-input`}
          value={title}
          disabled={locked}
          maxLength={TITLE_MAX + 20}
          aria-invalid={showErrors.title && titleError !== undefined}
          aria-describedby={titleErrorId}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => setShowErrors((shown) => ({ ...shown, title: true }))}
        />
        <div className="field__hint" id={titleErrorId}>
          {showErrors.title && titleError ? (
            <span className="field__error">{titleError}</span>
          ) : (
            <span className="muted tabular">
              {title.trim().length} de {TITLE_MAX}
            </span>
          )}
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${priceErrorId}-input`}>
          Preço (R$)
        </label>
        <input
          id={`${priceErrorId}-input`}
          className="tabular"
          inputMode="decimal"
          value={priceText}
          disabled={locked}
          aria-invalid={showErrors.price && priceError !== undefined}
          aria-describedby={priceErrorId}
          onChange={(event) => setPriceText(event.target.value)}
          onBlur={() => setShowErrors((shown) => ({ ...shown, price: true }))}
        />
        <div className="field__hint" id={priceErrorId}>
          {showErrors.price && priceError && <span className="field__error">{priceError}</span>}
        </div>
      </div>
      <button type="submit" className="btn btn--primary" disabled={locked || !hasChanges}>
        Salvar alterações
      </button>
    </form>
  );
}

function StatusActions({ listing }: { listing: Listing }) {
  const { runBulk } = useListingActions();
  const [confirmingSale, setConfirmingSale] = useState(false);
  const { id, status } = listing;

  if (status === 'vendido') return null;

  if (confirmingSale) {
    return (
      <div className="panel__actions">
        <span>Marcar como vendido? Não dá para desfazer.</span>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setConfirmingSale(false);
            void runBulk('vender', [id]);
          }}
        >
          Confirmar
        </button>
        <button type="button" className="btn" onClick={() => setConfirmingSale(false)}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="panel__actions">
      {canApply('pausar', status) && (
        <button type="button" className="btn" onClick={() => void runBulk('pausar', [id])}>
          Pausar
        </button>
      )}
      {canApply('reativar', status) && (
        <button type="button" className="btn" onClick={() => void runBulk('reativar', [id])}>
          {status === 'expirado' ? 'Renovar e reativar' : 'Reativar'}
        </button>
      )}
      <button type="button" className="btn" onClick={() => setConfirmingSale(true)}>
        Marcar como vendido
      </button>
    </div>
  );
}

/** Carregado sob demanda: quem só consulta a lista não baixa o formulário nem o gráfico. */
export default function ListingPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const listing = useAppSelector((state) => selectListingsById(state).get(id));
  const pending = useAppSelector((state) => selectPendingIds(state).has(id));
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  // Clique fora da folha cai no próprio <dialog>, que ocupa a tela com o backdrop.
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  if (!listing) return null;

  return (
    <dialog ref={dialog} className="panel" aria-labelledby="panel-title" onClose={onClose} onClick={closeOnBackdrop}>
      <div className="panel__inner">
        <header className="panel__header">
          <div>
            <h2 id="panel-title">{listing.id}</h2>
            <p>
              <StatusText status={listing.status} />
              {pending && <span className="saving">salvando</span>}
            </p>
          </div>
          <button type="button" className="btn btn--text" onClick={onClose}>
            Fechar
          </button>
        </header>

        <EditForm key={listing.id} listing={listing} onDone={onClose} />

        <section className="panel__section" aria-label="Desempenho">
          <dl className="facts">
            <div>
              <dt>Visualizações</dt>
              <dd className="tabular">{formatInt(listing.views)}</dd>
            </div>
            <div>
              <dt>Contatos</dt>
              <dd className="tabular">{formatInt(listing.contacts)}</dd>
            </div>
            <div>
              <dt>Taxa de contato</dt>
              <dd className="tabular">{formatPercent(contactRate(listing.views, listing.contacts))}</dd>
            </div>
          </dl>
          <ViewsBars values={listing.viewsLast14Days} />
        </section>

        <section className="panel__section" aria-label="Dados do anúncio">
          <dl className="facts facts--rows">
            <div>
              <dt>Categoria</dt>
              <dd>{listing.category}</dd>
            </div>
            <div>
              <dt>Local</dt>
              <dd>
                {listing.city}/{listing.uf}
              </dd>
            </div>
            <div>
              <dt>Publicado em</dt>
              <dd className="tabular">{formatDate(listing.createdAt)}</dd>
            </div>
            <div>
              <dt>{listing.status === 'expirado' ? 'Venceu em' : 'Vence em'}</dt>
              <dd className="tabular">{formatDate(listing.expiresAt)}</dd>
            </div>
          </dl>
        </section>

        <StatusActions listing={listing} />
      </div>
    </dialog>
  );
}
