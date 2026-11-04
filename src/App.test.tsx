import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import type { FakeApi } from './api/fakeApi';
import App from './App';
import { createAppStore } from './app/store';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import type { Listing } from './features/listings/model/types';
import { formatBRL } from './lib/format';
import { controlledApi, makeListing, quietApi, serverError, setViewport } from './test/utils';

const rows: Listing[] = [
  makeListing({ id: 'AN-1', title: 'Bicicleta aro 29 revisada', priceCents: 150_000, createdAt: '2026-10-03T00:00:00.000Z' }),
  makeListing({ id: 'AN-2', title: 'Sofá retrátil 3 lugares', priceCents: 90_000, status: 'pausado', createdAt: '2026-10-02T00:00:00.000Z' }),
  makeListing({ id: 'AN-3', title: 'Geladeira frost free nova', priceCents: 200_000, createdAt: '2026-10-01T00:00:00.000Z' }),
];

function renderApp(api: FakeApi) {
  const store = createAppStore(api);
  render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <App api={api} />
        </ToastProvider>
      </ThemeProvider>
    </Provider>,
  );
  return { store, user: userEvent.setup() };
}

const rowOf = (title: string) => screen.getByRole('button', { name: title }).closest('tr')!;

async function openAndSetPrice(user: ReturnType<typeof userEvent.setup>, title: string, price: string) {
  await user.click(await screen.findByRole('button', { name: title }));
  const input = await screen.findByRole('textbox', { name: 'Preço (R$)' });
  await user.clear(input);
  await user.type(input, price);
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
}

describe('fluxo completo', () => {
  it('carrega a lista e o resumo, e a busca filtra', async () => {
    const { user } = renderApp(quietApi(rows));
    expect(screen.getByRole('status', { name: 'Carregando anúncios' })).toBeInTheDocument();
    // O entorno já está na tela durante a carga, para nada pular quando os dados chegarem.
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Sofá retrátil 3 lugares' })).toBeInTheDocument();
    expect(screen.getByText('no ar, de 3')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'sofa');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Bicicleta aro 29 revisada' })).not.toBeInTheDocument());
    expect(screen.getByText('1 resultado')).toBeInTheDocument();
  });

  it('não mostra "nenhum anúncio" em nenhum momento da carga', async () => {
    const seen: boolean[] = [];
    const observer = new MutationObserver(() => {
      seen.push(document.body.textContent.includes('Nenhum anúncio'));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    renderApp(quietApi(rows));
    await screen.findByRole('button', { name: 'Sofá retrátil 3 lugares' });
    observer.disconnect();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen).not.toContain(true);
  });

  it('filtro sem resultado oferece limpar', async () => {
    const { user } = renderApp(quietApi(rows));
    await screen.findByRole('button', { name: 'Sofá retrátil 3 lugares' });
    await user.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'inexistente');
    expect(await screen.findByText('Nenhum anúncio com esses filtros.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]!);
    expect(await screen.findByRole('button', { name: 'Sofá retrátil 3 lugares' })).toBeInTheDocument();
  });

  it('falha ao carregar mostra o erro e "Tentar de novo" recupera', async () => {
    const api = quietApi(rows, { failureRate: 1, failFirstLoad: true });
    const { user } = renderApp(api);
    const alert = await screen.findByRole('alert');
    api.configure({ failureRate: 0 });
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('button', { name: 'Sofá retrátil 3 lugares' })).toBeInTheDocument();
  });

  it('o menu de simulação muda a taxa de falha da API', async () => {
    const api = quietApi(rows);
    const { user } = renderApp(api);
    await screen.findByRole('button', { name: 'Sofá retrátil 3 lugares' });
    await user.click(screen.getByRole('button', { name: 'Simular API' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Falha nas requisições' }), 'Sempre');
    expect(api.getConfig().failureRate).toBe(1);
  });
});

describe('rollback visto pela tela', () => {
  it('edição: valor novo na hora, volta ao antigo com aviso quando falha, e o retry funciona', async () => {
    const { api, updates } = controlledApi(rows);
    const { user } = renderApp(api);
    await openAndSetPrice(user, 'Bicicleta aro 29 revisada', '1.999,90');

    // Otimista: o painel fechou e a linha já mostra o valor novo, marcada como salvando.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const row = rowOf('Bicicleta aro 29 revisada');
    expect(row.textContent).toContain(formatBRL(199_990));
    expect(within(row).getByText('salvando')).toBeInTheDocument();

    await act(async () => updates[0]!.reject(serverError()));

    // Rollback: valor antigo de volta, sem "salvando", e o aviso explica.
    expect(row.textContent).toContain(formatBRL(150_000));
    expect(within(row).queryByText('salvando')).not.toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Não deu para salvar AN-1');
    expect(alert).toHaveTextContent('Os valores anteriores voltaram');

    // Tentar de novo reaplica a mesma alteração, e dessa vez confirma.
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));
    expect(row.textContent).toContain(formatBRL(199_990));
    await act(async () =>
      updates[1]!.resolve({ ...rows[0]!, priceCents: 199_990, version: 2 }),
    );
    expect(row.textContent).toContain(formatBRL(199_990));
    expect(await screen.findByText('AN-1 salvo.')).toBeInTheDocument();
  });

  it('lote: seleção vira ação otimista, e a falha devolve os status', async () => {
    const { api, bulks } = controlledApi(rows);
    const { user } = renderApp(api);
    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar Bicicleta aro 29 revisada' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar Geladeira frost free nova' }));
    expect(screen.getByText('2 selecionados')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pausar (2)' }));
    expect(bulks[0]!.args).toEqual([['AN-1', 'AN-3'], 'pausado']);
    expect(rowOf('Bicicleta aro 29 revisada')).toHaveTextContent('Pausado');
    expect(screen.getByRole('button', { name: /Pausados 3/ })).toBeInTheDocument();
    expect(screen.queryByText('2 selecionados')).not.toBeInTheDocument();

    await act(async () => bulks[0]!.reject(serverError()));

    expect(rowOf('Bicicleta aro 29 revisada')).toHaveTextContent('Ativo');
    expect(rowOf('Geladeira frost free nova')).toHaveTextContent('Ativo');
    expect(screen.getByRole('button', { name: /Pausados 1/ })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para pausar 2 anúncios');
  });

  it('lote parcial: avisa quantos falharam e o retry reenvia só esses', async () => {
    const { api, bulks } = controlledApi(rows);
    const { user } = renderApp(api);
    await user.click(await screen.findByRole('checkbox', { name: 'Selecionar Bicicleta aro 29 revisada' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar Geladeira frost free nova' }));
    await user.click(screen.getByRole('button', { name: 'Pausar (2)' }));

    await act(async () =>
      bulks[0]!.resolve({
        updated: [{ ...rows[0]!, status: 'pausado', version: 2 }],
        failed: [{ id: 'AN-3', reason: 'Falha ao salvar este anúncio.' }],
      }),
    );

    expect(rowOf('Bicicleta aro 29 revisada')).toHaveTextContent('Pausado');
    expect(rowOf('Geladeira frost free nova')).toHaveTextContent('Ativo');
    expect(screen.getByText(/1 de 2 deram certo\. 1 anúncio voltou/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(bulks[1]!.args).toEqual([['AN-3'], 'pausado']);
  });
});

describe('responsivo', () => {
  it('no desktop usa tabela', async () => {
    renderApp(quietApi(rows));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('no celular usa lista, sem tabela no DOM, e o fluxo de seleção continua', async () => {
    setViewport('mobile');
    const { user } = renderApp(quietApi(rows));
    await screen.findByRole('list');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    await user.click(screen.getByRole('checkbox', { name: 'Selecionar esta página' }));
    expect(screen.getByText('3 selecionados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pausar (2)' })).toBeInTheDocument();
  });
});
