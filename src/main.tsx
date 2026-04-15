import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/sora/400.css'
import '@fontsource/sora/600.css'
import './index.css'
import App from './App.tsx'

import React from 'react'

class ErrorBoundary extends React.Component<{children: any}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div style={{position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'red', color: 'white', padding: '20px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', width: '100vw', height: '100vh', overflow: 'auto'}} id="MOCK_ERROR_BOUNDARY">
        {this.state.error instanceof Error ? this.state.error.stack : String(this.state.error)}
      </div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
