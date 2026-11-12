import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from '@/context/LanguageContext';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: 'red', padding: 20, whiteSpace: 'pre-wrap' }}>
          {this.state.error.message}
          {'\n'}
          {this.state.error.stack}
        </pre>
      );
    }

    return this.props.children;
  }
}

document.addEventListener('wheel', (event) => {
  if (event.ctrlKey || event.metaKey) event.preventDefault();
}, { passive: false });

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && ['+', '-', '=', '0'].includes(event.key)) {
    event.preventDefault();
  }
});

document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('gesturechange', (event) => event.preventDefault());
document.addEventListener('gestureend', (event) => event.preventDefault());

document.addEventListener('dragstart', (event) => {
  const target = event.target as HTMLElement;
  if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
    event.preventDefault();
  }
});

document.addEventListener('contextmenu', (event) => {
  const target = event.target as HTMLElement;
  if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </LanguageProvider>
  </StrictMode>
);
