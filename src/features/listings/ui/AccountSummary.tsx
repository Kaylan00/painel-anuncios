import { useAppSelector } from '../../../app/hooks';
import { formatBRLWhole, formatInt, formatPercent } from '../../../lib/format';
import { selectAccountSummary, selectLoadStatus } from '../model/selectors';

/** Ocupa o mesmo espaço dos números reais durante a carga, para a página não pular quando eles chegam. */
const PLACEHOLDER = { activeCount: 587, total: 1000, activeValueCents: 4_000_000_000, views: 500_000, contacts: 15_000, rate: 0.03 };

/** Uma linha de leitura, não um conjunto de cartões: o vendedor olha os números e desce para a lista. */
export function AccountSummary() {
  const real = useAppSelector(selectAccountSummary);
  const ready = useAppSelector(selectLoadStatus) === 'ready';
  const summary = ready ? real : PLACEHOLDER;
  return (
    <dl className={ready ? 'summary' : 'summary is-loading'} aria-label="Resumo da conta">
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
