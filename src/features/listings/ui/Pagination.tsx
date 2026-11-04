import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { formatInt } from '../../../lib/format';
import { PAGE_SIZES, pageChanged, pageSizeChanged } from '../model/filtersSlice';
import { selectPageInfo } from '../model/selectors';

export function Pagination() {
  const dispatch = useAppDispatch();
  const { page, pageSize, total, totalPages, startIndex, endIndex } = useAppSelector(selectPageInfo);

  return (
    <nav className="pagination" aria-label="Paginação">
      <span className="muted tabular">
        {total === 0 ? '0' : `${formatInt(startIndex + 1)}–${formatInt(endIndex)}`} de {formatInt(total)}
      </span>
      <label className="pagination__size muted">
        Por página
        <select value={pageSize} onChange={(event) => dispatch(pageSizeChanged(Number(event.target.value)))}>
          {PAGE_SIZES.map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
      </label>
      <div className="pagination__pages">
        <button type="button" className="btn" disabled={page <= 1} onClick={() => dispatch(pageChanged(page - 1))}>
          Anterior
        </button>
        <span className="tabular">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn"
          disabled={page >= totalPages}
          onClick={() => dispatch(pageChanged(page + 1))}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
