import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface ModalProps {
  /** Controls modal visibility (supports both isOpen and legacy open) */
  isOpen?: boolean;
  open?: boolean;
  /** Callback fired when modal requests to close (backdrop click, escape key, or close button) */
  onClose: () => void;
  /** Modal body content */
  children: ReactNode;
  /** Optional accessible title rendered in header */
  title?: ReactNode;
  /** Optional accessible description */
  description?: ReactNode;
  /** Sizing presets */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  /** Display variant: centered dialog or right-side slide-over drawer */
  variant?: 'center' | 'drawer-right';
  /** Custom classes for modal dialog card */
  className?: string;
  /** Custom classes for outer positioning container */
  containerClassName?: string;
  /** Custom classes for backdrop overlay */
  backdropClassName?: string;
  /** Hide the default absolute top-right close button */
  hideCloseButton?: boolean;
  /** Whether clicking backdrop triggers onClose (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape key triggers onClose (default: true) */
  closeOnEscape?: boolean;
  /** Custom z-index class (default: 'z-[99999]') */
  zIndex?: string;
  /** Accessible label when no visual title is passed */
  ariaLabel?: string;
}

const sizes: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-2xl lg:max-w-3xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-[calc(100vw-2rem)] h-[calc(100dvh-2rem)]',
};

export function Modal({
  open,
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  variant = 'center',
  className,
  containerClassName,
  backdropClassName,
  hideCloseButton = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  zIndex = 'z-[99999]',
  ariaLabel,
}: ModalProps) {
  const visible = Boolean(open ?? isOpen);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 1. Lock body scroll and track focus restoration
  useEffect(() => {
    if (visible && typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            dialogRef.current.focus();
          }
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        previousActiveElement.current?.focus?.();
      };
    }
  }, [visible]);

  // 2. Keyboard handling: Escape key to dismiss & Tab focus trapping
  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose();
        return;
      }

      // Focus Trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, closeOnEscape, onClose]);

  if (!visible) return null;

  const isDrawer = variant === 'drawer-right';

  const modalElement = (
    <div
      className={cn(
        'fixed inset-0 flex',
        zIndex,
        isDrawer ? 'justify-end' : 'items-center justify-center p-3 sm:p-5',
        containerClassName
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in cursor-default',
          backdropClassName
        )}
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Modal Dialog Surface */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-dialog-title' : undefined}
        aria-describedby={description ? 'modal-dialog-description' : undefined}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          'relative bg-white shadow-2xl focus:outline-none overflow-hidden flex flex-col',
          isDrawer
            ? 'w-full max-w-xl h-[100dvh] animate-slide-left font-sans'
            : cn(
                'w-full rounded-2xl sm:rounded-3xl animate-scale-in max-h-[92vh]',
                sizes[size] || sizes.md,
                'my-auto'
              ),
          className
        )}
      >
        {/* Optional Visual Title & Description Header */}
        {(title || description) && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              {title && (
                <h2 id="modal-dialog-title" className="text-lg font-extrabold text-slate-900 leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-dialog-description" className="text-xs text-slate-500 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Built-in Close Button */}
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 z-50 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    try {
      return createPortal(modalElement, document.body);
    } catch {
      return modalElement;
    }
  }

  return modalElement;
}
