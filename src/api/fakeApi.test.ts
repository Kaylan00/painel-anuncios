import { describe, expect, it } from 'vitest';
import { makeListing, quietApi } from '../test/utils';
import { ApiError } from './fakeApi';

const rows = [
  makeListing({ id: 'A', status: 'ativo' }),
  makeListing({ id: 'P', status: 'pausado' }),
  makeListing({ id: 'E', status: 'expirado', expiresAt: '2026-01-01T00:00:00.000Z' }),
  makeListing({ id: 'V', status: 'vendido' }),
];

async function byId(api: ReturnType<typeof quietApi>, id: string) {
  const all = await api.fetchListings();
  return all.find((row) => row.id === id)!;
}

describe('createFakeApi', () => {
  it('entrega cópias: alterar o retorno não altera o "servidor"', async () => {
    const api = quietApi(rows);
    const first = await api.fetchListings();
    first[0]!.title = 'alterado fora da API';
    expect((await api.fetchListings())[0]!.title).toBe(rows[0]!.title);
  });

  it('a primeira carga não falha por padrão, as seguintes sim', async () => {
    const api = quietApi(rows, { failureRate: 1 });
    await expect(api.fetchListings()).resolves.toHaveLength(4);
    await expect(api.fetchListings()).rejects.toBeInstanceOf(ApiError);
  });

  it('failFirstLoad faz a primeira carga falhar também', async () => {
    const api = quietApi(rows, { failureRate: 1, failFirstLoad: true });
    await expect(api.fetchListings()).rejects.toBeInstanceOf(ApiError);
  });

  it('atualiza, incrementa a versão e limpa espaços do título', async () => {
    const api = quietApi(rows);
    const updated = await api.updateListing('A', { title: '  Notebook usado com capa  ', priceCents: 99_900 });
    expect(updated).toMatchObject({ title: 'Notebook usado com capa', priceCents: 99_900, version: 2 });
    expect((await byId(api, 'A')).version).toBe(2);
  });

  it('falha simulada não grava nada', async () => {
    const api = quietApi(rows);
    await api.fetchListings();
    api.configure({ failureRate: 1 });
    await expect(api.updateListing('A', { priceCents: 1000 })).rejects.toMatchObject({
      name: 'ApiError',
    });
    api.configure({ failureRate: 0 });
    expect((await byId(api, 'A')).priceCents).toBe(rows[0]!.priceCents);
  });

  it('o servidor também valida: não confia no formulário', async () => {
    const api = quietApi(rows);
    await expect(api.updateListing('A', { priceCents: 5 })).rejects.toMatchObject({ code: 'validation' });
    await expect(api.updateListing('A', { title: 'curto' })).rejects.toMatchObject({ code: 'validation' });
  });

  it('recusa editar anúncio vendido ou inexistente', async () => {
    const api = quietApi(rows);
    await expect(api.updateListing('V', { priceCents: 1000 })).rejects.toMatchObject({ code: 'conflict' });
    await expect(api.updateListing('nada', { priceCents: 1000 })).rejects.toMatchObject({ code: 'not_found' });
  });

  it('o lote aplica o que pode e relata o que não pôde', async () => {
    const api = quietApi(rows);
    const result = await api.bulkUpdateStatus(['A', 'V', 'nada'], 'pausado');
    expect(result.updated.map((row) => row.id)).toEqual(['A']);
    expect(result.failed.map((item) => item.id)).toEqual(['V', 'nada']);
    expect((await byId(api, 'V')).status).toBe('vendido');
  });

  it('falha por item deixa os outros itens confirmados', async () => {
    // Sorteios na ordem: latência não usa a sorte com span 0, então a sequência é só dos itens.
    const draws = [0.9, 0.9, 0.1, 0.9, 0];
    const api = quietApi(rows, { itemFailureRate: 0.5, random: () => draws.shift() ?? 0.9 });
    const result = await api.bulkUpdateStatus(['A', 'P'], 'vendido');
    expect(result.updated.map((row) => row.id)).toEqual(['A']);
    expect(result.failed.map((item) => item.id)).toEqual(['P']);
  });

  it('reativar um anúncio vencido renova o prazo', async () => {
    const now = Date.UTC(2026, 10, 3);
    const api = quietApi(rows, { now: () => now });
    const { updated } = await api.bulkUpdateStatus(['E', 'P'], 'ativo');
    expect(new Date(updated[0]!.expiresAt).getTime()).toBeGreaterThan(now);
    expect(updated[1]!.expiresAt).toBe(rows[1]!.expiresAt);
  });
});
