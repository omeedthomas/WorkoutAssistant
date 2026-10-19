import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface ToastMessage {
  id: number;
  title: string;
  body?: string;
}

/** Shows a toast; important ones can stay up longer than the default 4 s. */
const ToastContext = createContext<(title: string, body?: string, ms?: number) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((title: string, body?: string, ms = 4000) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), title, body });
    timer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <button key={toast.id} className="toast" onClick={() => setToast(null)}>
            <Sparkles size={18} aria-hidden />
            <span>
              <strong>{toast.title}</strong>
              {toast.body && <span className="toast__body">{toast.body}</span>}
            </span>
          </button>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
