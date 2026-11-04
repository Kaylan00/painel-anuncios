import { describe, expect, it } from 'vitest';
import { formatPriceInput, parsePriceInput, validateEdit, validatePriceCents, validateTitle } from './validation';

describe('validateTitle', () => {
  it.each([
    'Notebook 15 polegadas',
    'Monitor 27 polegadas com nota fiscal',
    'Ar-condicionado 12000 BTU',
    'Hatch 1.0 2019 único dono',
    'Modelo 2019-2020 revisado',
  ])('aceita "%s"', (title) => {
    expect(validateTitle(title)).toBeUndefined();
  });

  it.each([
    ['', 'Informe'],
    ['      ', 'Informe'],
    ['Sofá', 'pelo menos'],
    ['x'.repeat(71), 'no máximo'],
    ['Geladeira ligue (27) 99999-1234', 'telefone'],
    ['Geladeira 27999991234', 'telefone'],
    ['Geladeira 3222-1234', 'telefone'],
    ['Veja em www.exemplo.com.br', 'Links'],
    ['Veja em https://exemplo.com', 'Links'],
    ['GELADEIRA FROST FREE', 'maiúsculas'],
  ])('recusa "%s"', (title, message) => {
    expect(validateTitle(title)).toContain(message);
  });

  it('considera o tamanho sem os espaços das pontas', () => {
    expect(validateTitle(`   ${'a'.repeat(70)}   `)).toBeUndefined();
  });
});

describe('parsePriceInput', () => {
  it.each([
    ['1.250,50', 125_050],
    ['1250,5', 125_050],
    ['1250', 125_000],
    ['R$ 1.250,50', 125_050],
    ['  99,90 ', 9_990],
    ['1.000.000', 100_000_000],
    ['0,01', 1],
  ])('lê "%s" como %i centavos', (text, cents) => {
    expect(parsePriceInput(text)).toBe(cents);
  });

  it.each(['', 'abc', '-10', '12.50', '1,234', '1.25,00', '10,5,5'])('recusa "%s"', (text) => {
    expect(parsePriceInput(text)).toBeNull();
  });

  it('não perde centavos por ponto flutuante', () => {
    // 19,99 * 100 em ponto flutuante dá 1998.9999...
    expect(parsePriceInput('19,99')).toBe(1999);
    expect(parsePriceInput('1.129,95')).toBe(112_995);
  });

  it('faz ida e volta com formatPriceInput', () => {
    for (const cents of [100, 1999, 125_050, 100_000_000]) {
      expect(parsePriceInput(formatPriceInput(cents))).toBe(cents);
    }
  });
});

describe('validatePriceCents e validateEdit', () => {
  it('aplica os limites nas bordas', () => {
    expect(validatePriceCents(null)).toBeDefined();
    expect(validatePriceCents(99)).toContain('mínimo');
    expect(validatePriceCents(100)).toBeUndefined();
    expect(validatePriceCents(2_000_000_000)).toBeUndefined();
    expect(validatePriceCents(2_000_000_001)).toContain('máximo');
  });

  it('só valida os campos presentes na edição', () => {
    expect(validateEdit({ priceCents: 500 })).toEqual({});
    expect(Object.keys(validateEdit({ title: 'x', priceCents: 1 }))).toEqual(['title', 'priceCents']);
  });
});
