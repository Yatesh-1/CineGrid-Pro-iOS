import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[CineGrid Pro ErrorBoundary caught error]:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-3 rounded-2xl bg-zinc-950/90 border border-rose-500/30 text-white flex flex-col items-center justify-center text-center space-y-3 backdrop-blur-md">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertCircle size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-white">
              {this.props.fallbackTitle || 'Subsystem Recovered from Error'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              The camera engine is protected and running smoothly. You can safely retry or close this panel.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
          >
            <RotateCcw size={13} />
            <span>Reset Module</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
