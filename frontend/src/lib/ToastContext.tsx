import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Toast, ToastType, ToastAction } from '@/components/ui/Toast';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (options: Omit<ToastItem, 'id'> | string) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) => string;
  error: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) => string;
  warning: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) => string;
  info: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (options: Omit<ToastItem, 'id'> | string): string => {
      const id = `toast-${Date.now()}-${++toastCounter}`;
      const item: ToastItem =
        typeof options === 'string'
          ? { id, message: options, type: 'info' }
          : { ...options, id };

      setToasts((prev) => {
        // Limit max active toasts to 4 to prevent screen clutter
        const next = [...prev, item];
        if (next.length > 4) {
          return next.slice(next.length - 4);
        }
        return next;
      });

      return id;
    },
    []
  );

  const success = useCallback(
    (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) =>
      showToast({ ...options, message, type: 'success' }),
    [showToast]
  );

  const error = useCallback(
    (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) =>
      showToast({ ...options, message, type: 'error' }),
    [showToast]
  );

  const warning = useCallback(
    (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) =>
      showToast({ ...options, message, type: 'warning' }),
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) =>
      showToast({ ...options, message, type: 'info' }),
    [showToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
      clearToasts,
      success,
      error,
      warning,
      info,
    }),
    [toasts, showToast, removeToast, clearToasts, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Return safe fallback so components can call useToast even if mounted outside provider during tests
    return {
      toasts: [],
      showToast: () => '',
      removeToast: () => {},
      clearToasts: () => {},
      success: () => '',
      error: () => '',
      warning: () => '',
      info: () => '',
    };
  }
  return ctx;
}

export function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx || ctx.toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-6 right-6 z-[9999] pointer-events-none flex flex-col gap-2.5 max-w-md w-full sm:w-auto items-end"
    >
      {ctx.toasts.map((t) => (
        <div key={t.id} className="relative w-full sm:w-auto">
          <Toast
            id={t.id}
            title={t.title}
            message={t.message}
            type={t.type}
            duration={t.duration ?? 4000}
            action={t.action}
            onClose={() => ctx.removeToast(t.id)}
            isStacked={true}
          />
        </div>
      ))}
    </div>
  );
}

export default ToastContext;
