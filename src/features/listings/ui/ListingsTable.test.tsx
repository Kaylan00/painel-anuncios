import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeListing, renderWithProviders } from '../../../test/utils';
import { ListingsTable } from './ListingsTable';
import type { Listing } from '../model/types';

const defaults = {
  selection: {} as Record<string, true>,
  pendingIds: new Set<string>(),
  allSelected: false,
  someSelected: false,
  onToggleAll: () => {},
  onToggle: () => {},
  onOpen: () => {},
};

describe('ListingsTable', () => {
  it('mostra preço, status e métricas em colunas', () => {
    const row = makeListing({ priceCents: 125_050, views: 2000, contacts: 50, status: 'pausado' });
    renderWithProviders(<ListingsTable {...defaults} rows={[row]} />);
    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell');
    const text = cells.map((cell) => cell.textContent);
    expect(text).toContain('R$ 1.250,50');
    expect(text).toContain('Pausado');
    expect(text).toContain('2.000');
    expect(text).toContain('2,5%');
  });

  it('clicar no cabeçalho ordena e expõe a direção em aria-sort', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<ListingsTable {...defaults} rows={[makeListing()]} />);

    await user.click(screen.getByRole('button', { name: /Preço/ }));
    expect(store.getState().filters).toMatchObject({ sortKey: 'preco', sortDir: 'desc' });
    expect(screen.getByRole('columnheader', { name: /Preço/ })).toHaveAttribute('aria-sort', 'descending');

    await user.click(screen.getByRole('button', { name: /Preço/ }));
    expect(screen.getByRole('columnheader', { name: /Preço/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: /Contatos/ })).not.toHaveAttribute('aria-sort');
  });

  it('marca a caixa do cabeçalho como parcial quando só parte está selecionada', () => {
    renderWithProviders(<ListingsTable {...defaults} rows={[makeListing()]} someSelected />);
    expect(screen.getByRole('checkbox', { name: 'Selecionar todos desta página' })).toBePartiallyChecked();
  });

  it('avisa quando a linha está sendo salva', () => {
    const row = makeListing();
    renderWithProviders(<ListingsTable {...defaults} rows={[row]} pendingIds={new Set([row.id])} />);
    expect(screen.getByText('salvando')).toBeInTheDocument();
    expect(screen.getAllByRole('row')[1]).toHaveAttribute('aria-busy', 'true');
  });

  it('chama onOpen pelo título e onToggle pela caixa', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    const row = makeListing({ id: 'AN-7', title: 'Bicicleta aro 29 revisada' });
    renderWithProviders(<ListingsTable {...defaults} rows={[row]} onOpen={onOpen} onToggle={onToggle} />);
    await user.click(screen.getByRole('button', { name: 'Bicicleta aro 29 revisada' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar Bicicleta aro 29 revisada' }));
    expect(onOpen).toHaveBeenCalledWith('AN-7');
    expect(onToggle).toHaveBeenCalledWith('AN-7');
  });

  it('selecionar uma linha renderiza só essa linha', () => {
    // Cada renderização de linha lê o título uma vez; contar as leituras conta as renderizações.
    const reads = new Map<string, number>();
    const rows: Listing[] = ['A', 'B', 'C'].map((id) => {
      const row = makeListing({ id });
      Object.defineProperty(row, 'title', {
        get() {
          reads.set(id, (reads.get(id) ?? 0) + 1);
          return `Título do anúncio ${id}`;
        },
      });
      return row;
    });

    const { rerenderUi } = renderWithProviders(<ListingsTable {...defaults} rows={rows} />);
    const before = new Map(reads);

    rerenderUi(<ListingsTable {...defaults} rows={rows} selection={{ B: true }} />);

    expect(reads.get('A')).toBe(before.get('A'));
    expect(reads.get('C')).toBe(before.get('C'));
    expect(reads.get('B')).toBeGreaterThan(before.get('B')!);
  });
});
