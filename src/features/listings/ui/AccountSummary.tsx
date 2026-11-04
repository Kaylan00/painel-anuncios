import { useAppSelector } from '../../../app/hooks';
import { formatBRLWhole, formatInt, formatPercent } from '../../../lib/format';
import { selectAccountSummary } from '../model/selectors';

/** Uma linha de leitura, não um conjunto de cartões: o vendedor olha os números e desce para a lista. */
export function AccountSummary() {
  const summary = useAppSelector(selectAccountSummary);
  return (
    <dl className="summary" aria-label="Resumo da conta">
      <div>
        <dd>{formatInt(summary.activeCount)}</dd>
        <dt>no ar, de {formatInt(summary.total)}</dt>
      </div>
      <div>
        <dd>{formatBRLWhole(summary.activeValueCents)}</dd>
        <dt>em anúncios ativos</dt>
      </div>
      <div>
        <dd>{formatInt(summary.views)}</dd>
        <dt>visualizações</dt>
      </div>
      <div>
        <dd>{formatInt(summary.contacts)}</dd>
        <dt>contatos</dt>
      </div>
      <div>
        <dd>{formatPercent(summary.rate)}</dd>
        <dt>taxa de contato</dt>
      </div>
    </dl>
  );
}
