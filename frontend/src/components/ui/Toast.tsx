import { useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'error' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export type ToastProps = {
  id?: string;
  title?: string;
  message: string;
  type?: ToastType;
  onClose?: () => void;
  duration?: number; // ms
  position?: 'top-right' | 'top-center' | 'bottom-right';
  action?: ToastAction;
  isStacked?: boolean;
};

const TYPE_CONFIG = {
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    title: 'text-emerald-900',
    body: 'text-emerald-800/90',
    iconColor: 'text-emerald-600',
    closeBtn: 'text-emerald-600 hover:bg-emerald-100',
    defaultTitle: 'Success!',
    Icon: CheckCircle,
  },
  error: {
    container: 'bg-rose-50 border-rose-200 text-rose-900',
    title: 'text-rose-900',
    body: 'text-rose-800/90',
    iconColor: 'text-rose-600',
    closeBtn: 'text-rose-600 hover:bg-rose-100',
    defaultTitle: 'Error',
    Icon: AlertCircle,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    title: 'text-amber-900',
    body: 'text-amber-800/90',
    iconColor: 'text-amber-600',
    closeBtn: 'text-amber-600 hover:bg-amber-100',
    defaultTitle: 'Warning',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    title: 'text-indigo-900',
    body: 'text-indigo-800/90',
    iconColor: 'text-indigo-600',
    closeBtn: 'text-indigo-600 hover:bg-indigo-100',
    defaultTitle: 'Information',
    Icon: Info,
  },
};

export function Toast({
  title,
  message,
  type = 'success',
  onClose,
  duration = 3500,
  position = 'top-right',
  action,
  isStacked = false,
}: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const IconComponent = cfg.Icon;
  const displayTitle = title ?? cfg.defaultTitle;

  const posClass = isStacked
    ? 'relative'
    : position === 'top-center'
    ? 'fixed top-6 left-1/2 transform -translate-x-1/2'
    : position === 'bottom-right'
    ? 'fixed bottom-6 right-6'
    : 'fixed top-6 right-6';

  return (
    <div className={`${posClass} z-[9999] max-w-md w-full sm:w-auto min-w-[320px] pointer-events-auto transition-all duration-200 ease-out animate-fade-in`}>
      <div className={`flex items-start gap-3.5 border rounded-2xl p-4 shadow-lg backdrop-blur-sm ${cfg.container}`}>
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent className={`w-5 h-5 ${cfg.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className={`font-bold text-sm tracking-tight ${cfg.title}`}>{displayTitle}</div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`p-1 rounded-lg transition-colors ${cfg.closeBtn}`}
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className={`text-xs font-medium mt-1 leading-relaxed ${cfg.body}`}>{message}</div>
          {action && (
            <div className="mt-2.5 pt-2 border-t border-black/5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  action.onClick();
                  onClose?.();
                }}
                className="px-3 py-1 rounded-lg bg-white/90 hover:bg-white text-xs font-bold text-slate-800 shadow-xs border border-slate-200/80 transition-all active:scale-95"
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Toast;
