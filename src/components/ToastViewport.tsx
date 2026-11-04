import { useToast, useToastList } from '../contexts/ToastContext';

export function ToastViewport() {
  const toasts = useToastList();
  const { dismiss } = useToast();
  return (
    // A região existe desde o início: leitor de tela só anuncia mudança em região já presente.
    <div className="toasts" role="region" aria-label="Avisos" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`} role={toast.tone === 'erro' ? 'alert' : 'status'}>
          <p>{toast.message}</p>
          <div className="toast__actions">
            {toast.action && (
              <button
                type="button"
                className="btn btn--text"
                onClick={() => {
                  dismiss(toast.id);
                  toast.action?.onClick();
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" className="btn btn--text" aria-label="Dispensar aviso" onClick={() => dismiss(toast.id)}>
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
