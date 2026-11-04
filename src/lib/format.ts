const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlWhole = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('pt-BR');
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' });

export const formatBRL = (cents: number) => brl.format(cents / 100);
export const formatBRLWhole = (cents: number) => brlWhole.format(cents / 100);
export const formatInt = (value: number) => integer.format(value);
export const formatPercent = (ratio: number) => percent.format(ratio);
export const formatDate = (iso: string) => date.format(new Date(iso));

/** Taxa de contato: quantas visualizações viraram conversa. */
export const contactRate = (views: number, contacts: number) => (views === 0 ? 0 : contacts / views);

/** Minúsculas e sem acento, para "cafe" achar "Café". */
export const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
