import { useState } from 'react';
import { formatInt } from '../../../lib/format';

const dayLabel = (daysAgo: number) => (daysAgo === 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : `Há ${daysAgo} dias`);

/** Uma série só: sem legenda, o título nomeia o dado. A tabela oculta atende leitor de tela. */
export function ViewsBars({ values }: { values: number[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const last = values.length - 1;

  const readout =
    hovered === null
      ? `${formatInt(total)} no período`
      : `${dayLabel(last - hovered)}: ${formatInt(values[hovered] ?? 0)}`;

  return (
    <figure className="bars">
      <figcaption>
        <span>Visualizações em 14 dias</span>
        <span className="bars__readout tabular">{readout}</span>
      </figcaption>
      <div className="bars__plot" aria-hidden="true" onPointerLeave={() => setHovered(null)}>
        {values.map((value, index) => (
          <div
            key={index}
            className={hovered === index ? 'bars__hit is-active' : 'bars__hit'}
            onPointerEnter={() => setHovered(index)}
          >
            <span style={{ height: `${value === 0 ? 0 : Math.max((value / max) * 100, 3)}%` }} />
          </div>
        ))}
      </div>
      <div className="bars__axis muted" aria-hidden="true">
        <span>{dayLabel(last)}</span>
        <span>Hoje</span>
      </div>
      <table className="sr-only">
        <caption>Visualizações por dia nos últimos 14 dias</caption>
        <tbody>
          {values.map((value, index) => (
            <tr key={index}>
              <th scope="row">{dayLabel(last - index)}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
