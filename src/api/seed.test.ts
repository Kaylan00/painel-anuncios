import { describe, expect, it } from 'vitest';
import { CATEGORIES, LISTING_STATUSES } from '../features/listings/model/types';
import { validatePriceCents, validateTitle } from '../features/listings/model/validation';
import { generateListings } from './seed';

const NOW = Date.UTC(2026, 10, 3);
const rows = generateListings(1000, 42, NOW);

describe('generateListings', () => {
  it('gera 1.000 anúncios com ids únicos', () => {
    expect(rows).toHaveLength(1000);
    expect(new Set(rows.map((row) => row.id)).size).toBe(1000);
  });

  it('é determinístico pela semente', () => {
    expect(generateListings(1000, 42, NOW)).toEqual(rows);
    expect(generateListings(1000, 43, NOW)).not.toEqual(rows);
  });

  it('cobre todos os status e categorias', () => {
    expect(new Set(rows.map((row) => row.status))).toEqual(new Set(LISTING_STATUSES));
    expect(new Set(rows.map((row) => row.category))).toEqual(new Set(CATEGORIES));
  });

  it('não gera anúncio que o próprio formulário recusaria', () => {
    for (const row of rows) {
      expect(validateTitle(row.title), row.title).toBeUndefined();
      expect(validatePriceCents(row.priceCents), row.id).toBeUndefined();
    }
  });

  it('mantém as métricas coerentes', () => {
    for (const row of rows) {
      expect(row.contacts).toBeLessThanOrEqual(row.views);
      expect(row.viewsLast14Days).toHaveLength(14);
      expect(row.viewsLast14Days.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(row.views);
    }
  });

  it('só o status expirado tem vencimento no passado', () => {
    for (const row of rows) {
      const expired = new Date(row.expiresAt).getTime() < NOW;
      expect(expired, row.id).toBe(row.status === 'expirado');
    }
  });
});
