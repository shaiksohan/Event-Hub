import { Component, type ReactNode } from 'react';

type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <p className="text-lg font-bold text-gray-900">Something went wrong</p>
            <p className="text-sm text-gray-500 mt-2">The page encountered an unexpected error and could not load.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 px-6 py-2.5 rounded-xl bg-[#0879c9] text-white font-semibold hover:bg-[#0668a8] transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
