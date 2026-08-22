import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  onCatchError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SpmErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[SPM ErrorBoundary] Component '${this.props.componentName || 'Unknown'}' failed to render:`, error, errorInfo);
    if (this.props.onCatchError) {
      this.props.onCatchError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          color: '#f87171',
          fontSize: '13px',
          fontFamily: 'sans-serif',
          margin: '8px 0'
        }}>
          ⚠️ <strong>[SPM] Component Error ({this.props.componentName || 'Unknown'})</strong>: {this.state.error?.message}
        </div>
      );
    }
    return this.props.children;
  }
}
