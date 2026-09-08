import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  title?: string;
  message?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full bg-white text-brand-black p-6 sm:p-8 rounded-2xl border border-black/10 shadow-sm text-center my-4 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 font-display">
              {this.props.title || 'Component Encountered an Issue'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              {this.props.message || 'Something went wrong loading this section. You can safely retry or continue with your booking.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl shadow hover:bg-[#c41a21] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.reset();
                window.location.reload();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
