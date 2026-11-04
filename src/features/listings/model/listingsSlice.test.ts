import { describe, expect, it } from 'vitest';
import { createAppStore } from '../../../app/store';
import { controlledApi, loadedState, makeListing, quietApi, serverError } from '../../../test/utils';
import reducer, { bulkChangeStatus, fetchListings, listingsAdapter, saveListing } from './listingsSlice';
import { selectConfirmedListings, selectListingsById, selectMutations } from './selectors';

const original = makeListing({ id: 'A', title: 'Título original longo', priceCents: 100_000, version: 1 });
const other = makeListing({ id: 'B', title: 'Outro anúncio qualquer', status: 'pausado', priceCents: 50_000, version: 1 });

function setup() {
  const { api, updates, bulks } = controlledApi();
  const store = createAppStore(api, loadedState([original, other]));
  const visible = (id: string) => selectListingsById(store.getState()).get(id)!;
  const confirmed = (id: string) => selectConfirmedListings(store.getState()).find((row) => row.id === id)!;
  return { store, updates, bulks, visible, confirmed };
}

describe('atualização otimista de um anúncio', () => {
  it('mostra o valor novo antes da resposta, sem tocar no dado confirmado', () => {
    const { store, visible, confirmed } = setup();
    void store.dispatch(saveListing({ id: 'A', changes: { priceCents: 200_000 } }));
    expect(visible('A').priceCents).toBe(200_000);
    expect(confirmed('A').priceCents).toBe(100_000);
    expect(selectMutations(store.getState())).toHaveLength(1);
  });

  it('na resposta de sucesso, adota o dado do servidor e limpa a pendência', async () => {
    const { store, updates, visible, confirmed } = setup();
    const done = store.dispatch(saveListing({ id: 'A', changes: { priceCents: 200_000 } }));
    updates[0]!.resolve({ ...original, priceCents: 200_000, version: 2, updatedAt: 'do-servidor' });
    await done;
    expect(selectMutations(store.getState())).toEqual([]);
    expect(confirmed('A')).toMatchObject({ priceCents: 200_000, version: 2, updatedAt: 'do-servidor' });
    expect(visible('A').priceCents).toBe(200_000);
  });

  it('rollback: quando falha, volta exatamente ao anterior e entrega o motivo', async () => {
    const { store, updates, visible } = setup();
    const done = store.dispatch(saveListing({ id: 'A', changes: { priceCents: 200_000, title: 'Título novo e válido' } }));
    expect(visible('A').title).toBe('Título novo e válido');
    updates[0]!.reject(serverError());
    const action = await done;
    expect(action.payload).toEqual({ code: 'server', message: 'O servidor retornou um erro inesperado.' });
    expect(visible('A')).toEqual(original);
    expect(selectMutations(store.getState())).toEqual([]);
  });

  it('erro que não é da API também desfaz e vira falha conhecida', async () => {
    const { store, updates, visible } = setup();
    const done = store.dispatch(saveListing({ id: 'A', changes: { priceCents: 1 } }));
    updates[0]!.reject(new TypeError('quebrou'));
    expect((await done).payload).toEqual({ code: 'unknown', message: 'Erro inesperado.' });
    expect(visible('A')).toEqual(original);
  });
});

describe('edições sobrepostas no mesmo anúncio', () => {
  it('a falha da primeira não apaga a segunda, ainda pendente', async () => {
    // Este é o caso que a estratégia de "guardar uma cópia e restaurar" erra: restaurar
    // a cópia da primeira edição apagaria a segunda, que ainda está em voo.
    const { store, updates, visible } = setup();
    const first = store.dispatch(saveListing({ id: 'A', changes: { priceCents: 111_100 } }));
    const second = store.dispatch(saveListing({ id: 'A', changes: { title: 'Segundo título válido' } }));

    updates[0]!.reject(serverError());
    await first;
    expect(visible('A')).toMatchObject({ priceCents: 100_000, title: 'Segundo título válido' });

    updates[1]!.resolve({ ...original, title: 'Segundo título válido', version: 2 });
    await second;
    expect(visible('A')).toMatchObject({ priceCents: 100_000, title: 'Segundo título válido', version: 2 });
  });

  it('a falha da segunda mantém a primeira', async () => {
    const { store, updates, visible } = setup();
    const first = store.dispatch(saveListing({ id: 'A', changes: { priceCents: 111_100 } }));
    const second = store.dispatch(saveListing({ id: 'A', changes: { priceCents: 222_200 } }));
    expect(visible('A').priceCents).toBe(222_200);

    updates[1]!.reject(serverError());
    await second;
    expect(visible('A').priceCents).toBe(111_100);

    updates[0]!.resolve({ ...original, priceCents: 111_100, version: 2 });
    await first;
    expect(visible('A').priceCents).toBe(111_100);
  });

  it('resposta antiga que chega depois da nova é ignorada pela versão', async () => {
    const { store, updates, confirmed } = setup();
    const first = store.dispatch(saveListing({ id: 'A', changes: { priceCents: 111_100 } }));
    const second = store.dispatch(saveListing({ id: 'A', changes: { priceCents: 222_200 } }));

    updates[1]!.resolve({ ...original, priceCents: 222_200, version: 3 });
    await second;
    updates[0]!.resolve({ ...original, priceCents: 111_100, version: 2 });
    await first;

    expect(confirmed('A')).toMatchObject({ priceCents: 222_200, version: 3 });
  });
});

describe('ação em lote', () => {
  it('aplica o status em todos na hora', () => {
    const { store, visible, confirmed } = setup();
    void store.dispatch(bulkChangeStatus({ ids: ['A', 'B'], status: 'vendido' }));
    expect(visible('A').status).toBe('vendido');
    expect(visible('B').status).toBe('vendido');
    expect(confirmed('A').status).toBe('ativo');
  });

  it('falha total desfaz o lote inteiro', async () => {
    const { store, bulks, visible } = setup();
    const done = store.dispatch(bulkChangeStatus({ ids: ['A', 'B'], status: 'vendido' }));
    bulks[0]!.reject(serverError());
    await done;
    expect(visible('A').status).toBe('ativo');
    expect(visible('B').status).toBe('pausado');
  });

  it('falha parcial desfaz só os itens que falharam', async () => {
    const { store, bulks, visible } = setup();
    const done = store.dispatch(bulkChangeStatus({ ids: ['A', 'B'], status: 'vendido' }));
    bulks[0]!.resolve({
      updated: [{ ...original, status: 'vendido', version: 2 }],
      failed: [{ id: 'B', reason: 'Falha ao salvar este anúncio.' }],
    });
    await done;
    expect(visible('A')).toMatchObject({ status: 'vendido', version: 2 });
    expect(visible('B')).toEqual(other);
    expect(selectMutations(store.getState())).toEqual([]);
  });

  it('dado que só o servidor conhece chega junto na confirmação', async () => {
    const { store, bulks, visible } = setup();
    const done = store.dispatch(bulkChangeStatus({ ids: ['B'], status: 'ativo' }));
    expect(visible('B').expiresAt).toBe(other.expiresAt);
    bulks[0]!.resolve({ updated: [{ ...other, status: 'ativo', expiresAt: '2027-01-01T00:00:00.000Z', version: 2 }], failed: [] });
    await done;
    expect(visible('B').expiresAt).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('carregamento', () => {
  it('passa por loading e ready', async () => {
    const store = createAppStore(quietApi([original, other]));
    expect(store.getState().listings.loadStatus).toBe('idle');
    const done = store.dispatch(fetchListings());
    expect(store.getState().listings.loadStatus).toBe('loading');
    await done;
    expect(store.getState().listings.loadStatus).toBe('ready');
    expect(selectConfirmedListings(store.getState())).toHaveLength(2);
  });

  it('não dispara uma segunda carga em paralelo', async () => {
    const store = createAppStore(quietApi([original]));
    const first = store.dispatch(fetchListings());
    const second = await store.dispatch(fetchListings());
    expect(fetchListings.rejected.match(second) && second.meta.condition).toBe(true);
    await first;
  });

  it('guarda a mensagem quando falha e permite tentar de novo', async () => {
    const api = quietApi([original], { failureRate: 1, failFirstLoad: true });
    const store = createAppStore(api);
    await store.dispatch(fetchListings());
    expect(store.getState().listings.loadStatus).toBe('failed');
    expect(store.getState().listings.loadError).toBeTruthy();

    api.configure({ failureRate: 0 });
    await store.dispatch(fetchListings());
    expect(store.getState().listings).toMatchObject({ loadStatus: 'ready', loadError: null });
  });
});

describe('reducer puro', () => {
  it('a confirmação insere anúncio que ainda não existia', () => {
    const initial = reducer(undefined, { type: '@@init' });
    const action = {
      type: saveListing.fulfilled.type,
      payload: makeListing({ id: 'novo' }),
      meta: { requestId: 'r', arg: { id: 'novo', changes: {} } },
    };
    expect(listingsAdapter.getSelectors().selectIds(reducer(initial, action))).toEqual(['novo']);
  });
});
