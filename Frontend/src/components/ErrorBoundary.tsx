import { Component, type ReactNode } from 'react';
import { Button, Notice } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Global error boundary per PLAN.md Phase 1: human-readable errors, never
// stack traces, tokens, raw paths, or patient payloads.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="login">
          <section>
            <h1>Something went wrong</h1>
            <Notice kind="error">
              The dashboard could not display this screen. The problem was recorded without exposing any patient
              information. Return to the overview and try again.
            </Notice>
            <Button onClick={() => window.location.reload()}>Reload dashboard</Button>
            <div className="loginTools">
              <Button variant="secondary" onClick={() => (window.location.hash = '#/overview')}>
                Go to overview
              </Button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
