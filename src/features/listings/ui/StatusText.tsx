import { STATUS_LABEL } from '../model/types';
import type { ListingStatus } from '../model/types';

export function StatusText({ status }: { status: ListingStatus }) {
  return (
    <span className={`status status--${status}`}>
      <i aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}
