import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-white">
          <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-red-400">Something went wrong</h2>
            <p className="mb-4 text-gray-300">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            <pre className="mb-4 max-h-40 overflow-auto rounded bg-gray-900 p-2 text-xs text-gray-300">
              {this.state.error?.toString() ?? 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-md bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 