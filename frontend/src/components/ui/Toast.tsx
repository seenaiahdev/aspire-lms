import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

type ToastProps = {
  title?: string;
  message: string;
  type?: 'success' | 'info' | 'error';
  onClose?: () => void;
  duration?: number; // ms
  position?: 'top-right' | 'top-center' | 'bottom-right';
};

export function Toast({ title = 'Success!', message, type = 'success', onClose, duration = 3500, position = 'top-right' }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const posClass = position === 'top-center' ? 'top-6 left-1/2 transform -translate-x-1/2' : 'top-6 right-6';

  return (
    <div className={`fixed ${posClass} z-[60] max-w-md`}>
      <div className="flex items-start gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
        <div className="flex-shrink-0 mt-0.5">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <div className="font-semibold text-emerald-800">{title}</div>
            <button onClick={onClose} className="p-1 rounded-md text-emerald-600 hover:bg-emerald-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-emerald-700/90 mt-1">{message}</div>
        </div>
      </div>
    </div>
  );
}

export default Toast;
