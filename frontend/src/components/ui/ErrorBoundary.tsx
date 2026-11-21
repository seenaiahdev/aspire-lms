import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2, ArrowLeft } from 'lucide-react';

export type ErrorBoundaryLevel = 'root' | 'route' | 'widget';

export interface ErrorBoundaryProps {
  children: ReactNode;
  level?: ErrorBoundaryLevel;
  title?: string;
  description?: string;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  route?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary:${this.props.level || 'root'}] Uncaught component error:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // If the route changed, automatically clear error state to allow recovery
    if (this.state.hasError && prevProps.route !== this.props.route && this.props.route !== undefined) {
      this.resetError();
    }
  }

  resetError = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    this.resetError();
    // Navigate safely to dashboard
    try {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      window.location.href = url.origin;
    } catch {
      window.location.href = '/';
    }
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, level = 'route', title, description, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      if (typeof fallback === 'function') {
        return error ? fallback(error, this.resetError) : null;
      }
      return fallback;
    }

    // ── Widget-level fallback (compact, contained) ──
    if (level === 'widget') {
      return (
        <div className="w-full p-6 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 shadow-2xs my-2">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">
              {title || 'This component encountered an error'}
            </h4>
            <p className="text-slate-500 text-xs font-medium mt-1 max-w-sm">
              {description || (error?.message ? error.message : 'An unexpected error occurred while rendering this module.')}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.resetError}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // ── Route-level and Root-level fallback (comprehensive recovery actions) ──
    const displayTitle =
      title ||
      (level === 'root'
        ? 'Application Error Encountered'
        : 'Something went wrong on this screen');

    const displayDesc =
      description ||
      (error?.message
        ? error.message
        : 'An unexpected rendering error occurred. You can reload, return to the dashboard, or clear temporary cache to recover.');

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-lg w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto shadow-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100/70 text-rose-700">
              {level === 'root' ? 'System Resilience Mode' : 'View Restored'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {displayTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
              {displayDesc}
            </p>
          </div>

          {/* Recovery Actions: Reload, Return to Dashboard, Clear Cache */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.resetError}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>

            <button
              type="button"
              onClick={this.handleGoDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200/80 active:scale-95"
            >
              <Home className="w-4 h-4" />
              Return to Dashboard
            </button>

            <button
              type="button"
              onClick={this.handleClearCacheAndReload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-all border border-slate-200/80 active:scale-95"
              title="Clears corrupted local cache and reloads application"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cache
            </button>
          </div>

          {/* Technical diagnostic details in collapsable view */}
          {error?.stack && (
            <details className="text-left pt-2 border-t border-slate-100">
              <summary className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer select-none">
                Technical Error Details
              </summary>
              <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
