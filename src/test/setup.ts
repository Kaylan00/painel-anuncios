import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { setViewport } from './utils';

// O jsdom não implementa estes dois recursos do navegador.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.open = false;
};

// O Node 25 expõe um localStorage próprio e sem métodos, que encobre o do jsdom.
function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

beforeEach(() => {
  setViewport('desktop');
  document.documentElement.dataset.theme = 'claro';
  vi.stubGlobal('localStorage', memoryStorage());
});

afterEach(() => {
  cleanup();
});
