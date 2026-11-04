import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeListing, renderWithProviders } from '../../../test/utils';
import { pageChanged, pageSizeChanged } from '../model/filtersSlice';
import { rowsSelected } from '../model/selectionSlice';
import { selectConfirmedListings } from '../model/selectors';
import { FilterBar } from './FilterBar';
import { Pagination } from './Pagination';
import { ResultsToolbar } from './ResultsToolbar';
import { StatusTabs } from './StatusTabs';

const rows = [
  makeListing({ id: 'A', status: 'ativo' }),
  makeListing({ id: 'B', status: 'ativo' }),
  makeListing({ id: 'P', status: 'pausado' }),
  makeListing({ id: 'E', status: 'expirado' }),
  makeListing({ id: 'V', status: 'vendido' }),
];

describe('FilterBar', () => {
  it('leva busca, categoria e preço para a store', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<FilterBar compact={false} />);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'sofa');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoria' }), 'Móveis');
    await user.type(screen.getByRole('textbox', { name: 'Preço de (R$)' }), '150');
    await user.type(screen.getByRole('textbox', { name: 'até (R$)' }), '2000');
    expect(store.getState().filters).toMatchObject({
      search: 'sofa',
      category: 'Móveis',
      priceMinCents: 15_000,
      priceMaxCents: 200_000,
    });
  });

  it('o campo de preço ignora o que não é dígito e aceita ser esvaziado', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<FilterBar compact={false} />);
    const min = screen.getByRole('textbox', { name: 'Preço de (R$)' });
    await user.type(min, '1a2');
    expect(min).toHaveValue('12');
    await user.clear(min);
    expect(store.getState().filters.priceMinCents).toBeNull();
  });

  it('avisa quando o mínimo passa do máximo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FilterBar compact={false} />);
    await user.type(screen.getByRole('textbox', { name: 'Preço de (R$)' }), '500');
    await user.type(screen.getByRole('textbox', { name: 'até (R$)' }), '100');
    expect(screen.getByRole('alert')).toHaveTextContent('mínimo está acima do máximo');
    expect(screen.getByRole('textbox', { name: 'até (R$)' })).toBeInvalid();
  });

  it('"Limpar filtros" só aparece com filtro ativo e limpa os campos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FilterBar compact={false} />);
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Buscar' });
    await user.type(search, 'x');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(search).toHaveValue('');
  });

  it('no celular esconde os filtros atrás de um botão, que mostra quantos estão ativos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FilterBar compact />);
    expect(screen.queryByRole('combobox', { name: 'Categoria' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Filtros' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Categoria' }), 'Moda');
    expect(screen.getByRole('button', { name: 'Filtros (1)' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toBeInTheDocument();
  });
});

describe('StatusTabs', () => {
  it('mostra as contagens e troca o filtro', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<StatusTabs />, { rows });
    expect(screen.getByRole('button', { name: 'Todos 5' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Ativos 2' }));
    expect(store.getState().filters.status).toBe('ativo');
    expect(screen.getByRole('button', { name: 'Ativos 2' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ResultsToolbar', () => {
  const select = (ids: string[]) => rowsSelected({ ids, selected: true });

  it('sem seleção mostra só o total, sem ações', () => {
    renderWithProviders(<ResultsToolbar pageIds={[]} allOnPageSelected={false} />, { rows });
    expect(screen.getByText('5 resultados')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Ações em lote' })).not.toBeInTheDocument();
  });

  it('cada botão mostra quantos selecionados podem receber a ação', async () => {
    const { store, findByRole } = renderWithProviders(<ResultsToolbar pageIds={[]} allOnPageSelected={false} />, { rows });
    store.dispatch(select(['A', 'P', 'V']));
    const actions = within(await findByRole('group', { name: 'Ações em lote' }));
    expect(actions.getByRole('button', { name: 'Pausar (1)' })).toBeEnabled();
    expect(actions.getByRole('button', { name: 'Reativar (1)' })).toBeEnabled();
    expect(actions.getByRole('button', { name: 'Vendido (2)' })).toBeEnabled();
  });

  it('desabilita a ação sem nenhum elegível', async () => {
    const { store } = renderWithProviders(<ResultsToolbar pageIds={[]} allOnPageSelected={false} />, { rows });
    store.dispatch(select(['V']));
    expect(await screen.findByRole('button', { name: 'Pausar (0)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vendido (0)' })).toBeDisabled();
  });

  it('marcar como vendido pede confirmação antes de enviar', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<ResultsToolbar pageIds={[]} allOnPageSelected={false} />, { rows });
    store.dispatch(select(['A']));
    await user.click(await screen.findByRole('button', { name: 'Vendido (1)' }));
    expect(screen.getByText(/Não dá para desfazer/)).toBeInTheDocument();
    expect(selectConfirmedListings(store.getState())[0]!.status).toBe('ativo');

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    await user.click(screen.getByRole('button', { name: 'Vendido (1)' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('1 anúncio marcado como vendido.')).toBeInTheDocument();
    expect(selectConfirmedListings(store.getState())[0]!.status).toBe('vendido');
    expect(store.getState().selection.ids).toEqual({});
  });

  it('com a página toda marcada, oferece selecionar todos os resultados', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<ResultsToolbar pageIds={['A', 'B']} allOnPageSelected />, { rows });
    store.dispatch(select(['A', 'B']));
    await user.click(await screen.findByRole('button', { name: 'Selecionar os 5' }));
    expect(Object.keys(store.getState().selection.ids)).toHaveLength(5);
  });
});

describe('Pagination', () => {
  const many = Array.from({ length: 60 }, (_, index) => makeListing({ id: `L${index}` }));

  it('mostra o intervalo e navega', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Pagination />, { rows: many });
    expect(screen.getByText('1–25 de 60')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('26–50 de 60')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('desabilita "Próxima" na última página e mudar o tamanho volta ao início', async () => {
    const { store } = renderWithProviders(<Pagination />, { rows: many });
    store.dispatch(pageChanged(3));
    expect(await screen.findByText('51–60 de 60')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    store.dispatch(pageSizeChanged(50));
    expect(await screen.findByText('1–50 de 60')).toBeInTheDocument();
  });
});
