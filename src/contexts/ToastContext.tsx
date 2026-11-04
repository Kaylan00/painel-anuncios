import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastTone = 'sucesso' | 'erro' | 'aviso';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  /** Callback não é serializável, outro motivo para aviso não morar na store. */
  action?: { label: string; onClick: () => void };
}

export type NewToast = Omit<Toast, 'id'>;

interface ToastActions {
  notify: (toast: NewToast) => void;
  dismiss: (id: number) => void;
}

// Dois contextos: quem só dispara aviso não renderiza de novo quando a lista muda.
const ToastActionsContext = createContext<ToastActions | null>(null);
const ToastListContext = createContext<Toast[]>([]);

const DURATION_MS: Record<ToastTone, number> = { sucesso: 4000, aviso: 8000, erro: 8000 };
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: NewToast) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE));
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS[toast.tone]));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const actions = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastActionsContext value={actions}>
      <ToastListContext value={toasts}>{children}</ToastListContext>
    </ToastActionsContext>
  );
}

export function useToast(): ToastActions {
  const context = use(ToastActionsContext);
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider');
  return context;
}

export function useToastList(): Toast[] {
  return use(ToastListContext);
}
