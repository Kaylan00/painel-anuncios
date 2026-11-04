import { useEffect, useRef, useState } from 'react';
import type { FakeApi } from '../api/fakeApi';
import { useAppDispatch } from '../app/hooks';
import { useTheme } from '../contexts/ThemeContext';
import { fetchListings } from '../features/listings/model/listingsSlice';

const FAILURE_OPTIONS = [
  { label: 'Nunca', failureRate: 0, itemFailureRate: 0 },
  { label: '10% (padrão)', failureRate: 0.1, itemFailureRate: 0.03 },
  { label: '50%', failureRate: 0.5, itemFailureRate: 0.1 },
  { label: 'Sempre', failureRate: 1, itemFailureRate: 0 },
];

const LATENCY_OPTIONS = [
  { label: 'Rápida (até 100 ms)', minLatencyMs: 20, maxLatencyMs: 100 },
  { label: 'Normal (250 a 800 ms)', minLatencyMs: 250, maxLatencyMs: 800 },
  { label: 'Lenta (2 a 4 s)', minLatencyMs: 2000, maxLatencyMs: 4000 },
];

/** Controles da API falsa, para ver o rollback acontecer sem depender da sorte. */
function SimulationMenu({ api }: { api: FakeApi }) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState(1);
  const [latency, setLatency] = useState(1);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={root}>
      <button type="button" className="btn btn--text" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Simular API
      </button>
      {open && (
        <div className="menu__panel">
          <p className="muted">Os dados são gerados no navegador e voltam ao início quando a página recarrega.</p>
          <label className="field">
            <span className="field__label">Falha nas requisições</span>
            <select
              value={failure}
              onChange={(event) => {
                const index = Number(event.target.value);
                const { failureRate, itemFailureRate } = FAILURE_OPTIONS[index]!;
                setFailure(index);
                api.configure({ failureRate, itemFailureRate });
              }}
            >
              {FAILURE_OPTIONS.map((option, index) => (
                <option key={option.label} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Latência</span>
            <select
              value={latency}
              onChange={(event) => {
                const index = Number(event.target.value);
                const { minLatencyMs, maxLatencyMs } = LATENCY_OPTIONS[index]!;
                setLatency(index);
                api.configure({ minLatencyMs, maxLatencyMs });
              }}
            >
              {LATENCY_OPTIONS.map((option, index) => (
                <option key={option.label} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setOpen(false);
              void dispatch(fetchListings());
            }}
          >
            Recarregar anúncios
          </button>
        </div>
      )}
    </div>
  );
}

export function AppHeader({ api }: { api: FakeApi }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="wordmark">varal</span>
        <span className="muted topbar__section">Painel do vendedor</span>
      </div>
      <div className="topbar__tools">
        <SimulationMenu api={api} />
        <button type="button" className="btn btn--text" onClick={toggleTheme}>
          Tema {theme === 'claro' ? 'escuro' : 'claro'}
        </button>
      </div>
    </header>
  );
}
