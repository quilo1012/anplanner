import { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-[hsl(0,85%,95%)] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-[hsl(var(--destructive))]" />
            </div>
            <h1 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
              Something went wrong
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              An unexpected error occurred. Please try reloading the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-left text-xs bg-[hsl(var(--muted))] p-3 rounded mb-4 overflow-auto max-h-32 text-[hsl(var(--destructive))]">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-md font-medium hover:bg-[hsl(220,70%,45%)] transition-colors"
            >
              <RotateCcw size={18} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
