import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeListing, quietApi, renderWithProviders } from '../../../test/utils';
import ListingPanel from './ListingPanel';

const listing = makeListing({ id: 'AN-9', title: 'Geladeira frost free', priceCents: 180_000, views: 200, contacts: 10 });

function setup(row = listing) {
  const api = quietApi([row]);
  const update = vi.spyOn(api, 'updateListing');
  const onClose = vi.fn();
  const view = renderWithProviders(<ListingPanel id={row.id} onClose={onClose} />, { rows: [row], api });
  return { ...view, update, onClose, user: userEvent.setup() };
}

const titleInput = () => screen.getByRole('textbox', { name: 'Título' });
const priceInput = () => screen.getByRole('textbox', { name: 'Preço (R$)' });
const saveButton = () => screen.getByRole('button', { name: 'Salvar alterações' });

describe('formulário de edição', () => {
  it('abre preenchido e com o salvar desabilitado enquanto nada mudou', () => {
    setup();
    expect(titleInput()).toHaveValue('Geladeira frost free');
    expect(priceInput()).toHaveValue('1.800,00');
    expect(saveButton()).toBeDisabled();
  });

  it('título inválido mostra o erro ao sair do campo e não envia', async () => {
    const { user, update, onClose } = setup();
    await user.clear(titleInput());
    await user.type(titleInput(), 'Curto');
    await user.tab();
    expect(screen.getByText(/pelo menos 8 caracteres/)).toBeInTheDocument();
    expect(titleInput()).toBeInvalid();

    await user.click(saveButton());
    expect(update).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('preço inválido mostra o erro e não envia', async () => {
    const { user, update } = setup();
    await user.clear(priceInput());
    await user.type(priceInput(), '12.50');
    await user.tab();
    expect(screen.getByText(/preço válido/)).toBeInTheDocument();
    fireEvent.submit(priceInput().closest('form')!);
    expect(update).not.toHaveBeenCalled();
  });

  it('envia só o campo que mudou e fecha o painel', async () => {
    const { user, update, onClose } = setup();
    await user.clear(priceInput());
    await user.type(priceInput(), '1.750,50');
    await user.click(saveButton());
    expect(update).toHaveBeenCalledWith('AN-9', { priceCents: 175_050 });
    expect(onClose).toHaveBeenCalled();
  });

  it('não considera mudança só de espaço nas pontas', async () => {
    const { user } = setup();
    await user.type(titleInput(), '   ');
    expect(saveButton()).toBeDisabled();
  });

  it('anúncio vendido fica somente leitura e sem ações de status', () => {
    setup(makeListing({ id: 'AN-9', status: 'vendido' }));
    expect(titleInput()).toBeDisabled();
    expect(priceInput()).toBeDisabled();
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Marcar como vendido' })).not.toBeInTheDocument();
  });
});

describe('painel do anúncio', () => {
  it('mostra métricas e a taxa de contato', () => {
    setup();
    expect(screen.getByText('5,0%')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Visualizações por dia/ })).toBeInTheDocument();
  });

  it('o gráfico lê o valor do dia ao passar o ponteiro', () => {
    const { container } = setup();
    expect(screen.getByText('105 no período')).toBeInTheDocument();
    const bars = container.querySelectorAll('.bars__hit');
    fireEvent.pointerEnter(bars[13]!);
    expect(screen.getByText('Hoje: 14')).toBeInTheDocument();
    fireEvent.pointerEnter(bars[0]!);
    expect(screen.getByText('Há 13 dias: 1')).toBeInTheDocument();
    fireEvent.pointerLeave(bars[0]!.parentElement!);
    expect(screen.getByText('105 no período')).toBeInTheDocument();
  });

  it('as ações mudam com o status', async () => {
    const { user } = setup(makeListing({ id: 'AN-9', status: 'expirado' }));
    expect(screen.queryByRole('button', { name: 'Pausar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Renovar e reativar' }));
    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument();
  });

  it('fecha pelo botão', async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fecha clicando fora da folha, mas não clicando dentro', async () => {
    const { user, onClose } = setup();
    await user.click(titleInput());
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
