import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profiler, memo, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport } from '../components/ToastViewport';
import { ThemeProvider, useTheme } from './ThemeContext';
import { ToastProvider, useToast } from './ToastContext';
import type { NewToast } from './ToastContext';

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}

describe('ThemeContext', () => {
  it('parte do tema decidido pelo script do index.html', () => {
    document.documentElement.dataset.theme = 'escuro';
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('escuro');
  });

  it('alternar muda o atributo no html e persiste', async () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement.dataset.theme).toBe('escuro');
    expect(localStorage.getItem('varal:tema')).toBe('escuro');
  });

  it('continua funcionando se o storage estiver bloqueado', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement.dataset.theme).toBe('escuro');
  });

  it('o hook explica o erro quando usado fora do provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeProbe />)).toThrow(/ThemeProvider/);
  });
});

describe('ToastContext', () => {
  let renders = 0;
  let notify: (toast: NewToast) => void;

  // Consumidor que só dispara: não pode renderizar de novo quando a lista muda.
  const Trigger = memo(function Trigger() {
    const { notify: send } = useToast();
    useEffect(() => {
      notify = send;
    }, [send]);
    return null;
  });

  function setup() {
    render(
      <ToastProvider>
        <Profiler id="trigger" onRender={() => (renders += 1)}>
          <Trigger />
        </Profiler>
        <ToastViewport />
      </ToastProvider>,
    );
  }

  beforeEach(() => {
    renders = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('some sozinho depois do tempo e o erro dura mais que o sucesso', () => {
    setup();
    act(() => {
      notify({ tone: 'sucesso', message: 'salvo' });
      notify({ tone: 'erro', message: 'falhou' });
    });
    expect(screen.getByRole('status')).toHaveTextContent('salvo');
    expect(screen.getByRole('alert')).toHaveTextContent('falhou');

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText('salvo')).not.toBeInTheDocument();
    expect(screen.getByText('falhou')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText('falhou')).not.toBeInTheDocument();
  });

  it('a ação roda o callback e dispensa o aviso', () => {
    setup();
    const onClick = vi.fn();
    act(() => notify({ tone: 'erro', message: 'falhou', action: { label: 'Tentar de novo', onClick } }));
    act(() => screen.getByRole('button', { name: 'Tentar de novo' }).click());
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByText('falhou')).not.toBeInTheDocument();
  });

  it('mantém no máximo quatro avisos, descartando os mais antigos', () => {
    setup();
    act(() => {
      for (const n of [1, 2, 3, 4, 5]) notify({ tone: 'aviso', message: `aviso ${n}` });
    });
    expect(screen.queryByText('aviso 1')).not.toBeInTheDocument();
    expect(screen.getByText('aviso 5')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(4);
  });

  it('quem só dispara aviso não renderiza quando a lista muda', () => {
    setup();
    const before = renders;
    act(() => notify({ tone: 'sucesso', message: 'um' }));
    act(() => notify({ tone: 'sucesso', message: 'dois' }));
    expect(screen.getByText('dois')).toBeInTheDocument();
    expect(renders).toBe(before);
  });
});
