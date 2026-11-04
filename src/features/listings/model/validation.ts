import type { ListingEdit } from './types';

export const TITLE_MIN = 8;
export const TITLE_MAX = 70;
export const PRICE_MIN_CENTS = 100;
export const PRICE_MAX_CENTS = 2_000_000_000; // R$ 20 milhões, teto dos imóveis

export interface FieldErrors {
  title?: string;
  priceCents?: string;
}

// Telefone com ou sem DDD. Fica de fora "Monitor 27", "12000 BTU" e um par de anos como "2019-2020".
const PHONE = /(?<!\d)(?!(?:19|20)\d{2}[\s.-](?:19|20)\d{2}\b)(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]\d{4}\b|\b\d{10,11}\b/;
const LINK = /\b(?:https?:\/\/|www\.)\S+/i;

export function validateTitle(raw: string): string | undefined {
  const title = raw.trim();
  if (title.length === 0) return 'Informe um título.';
  if (title.length < TITLE_MIN) return `Use pelo menos ${TITLE_MIN} caracteres.`;
  if (title.length > TITLE_MAX) return `Use no máximo ${TITLE_MAX} caracteres.`;
  if (PHONE.test(title)) return 'Tire o telefone do título. Os contatos chegam pelo chat.';
  if (LINK.test(title)) return 'Links não são permitidos no título.';
  const letters = title.replace(/[^\p{L}]/gu, '');
  if (letters.length >= TITLE_MIN && letters === letters.toLocaleUpperCase('pt-BR')) {
    return 'Evite escrever o título inteiro em maiúsculas.';
  }
  return undefined;
}

export function validatePriceCents(cents: number | null): string | undefined {
  if (cents === null) return 'Informe um preço válido, como 1.250,00.';
  if (cents < PRICE_MIN_CENTS) return 'O preço mínimo é R$ 1,00.';
  if (cents > PRICE_MAX_CENTS) return 'O preço máximo é R$ 20.000.000,00.';
  return undefined;
}

export function validateEdit(edit: ListingEdit): FieldErrors {
  const errors: FieldErrors = {};
  if (edit.title !== undefined) {
    const message = validateTitle(edit.title);
    if (message) errors.title = message;
  }
  if (edit.priceCents !== undefined) {
    const message = validatePriceCents(edit.priceCents);
    if (message) errors.priceCents = message;
  }
  return errors;
}

/**
 * Lê um preço digitado no formato brasileiro e devolve centavos, ou null se
 * for inválido. Aceita "1.250,50", "1250,5", "1250" e "R$ 1.250,50". Recusa
 * "12.50": no Brasil o ponto separa milhar, e adivinhar aqui mudaria um preço.
 */
export function parsePriceInput(raw: string): number | null {
  const text = raw.replace(/^\s*R\$\s*/i, '').trim();
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(text)) return null;
  const [whole = '0', fraction = ''] = text.replaceAll('.', '').split(',');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Inverso de parsePriceInput, usado para preencher o campo de edição. */
export function formatPriceInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
