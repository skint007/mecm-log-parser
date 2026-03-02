import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { VsCodeApiProvider } from './hooks/useVsCodeApi.js';
import './themes/agGridVscode.css';

declare global {
  interface Window {
    acquireVsCodeApi(): {
      postMessage(message: unknown): void;
      getState<T = unknown>(): T | undefined;
      setState<T = unknown>(state: T): void;
    };
  }
}

// acquireVsCodeApi() must be called exactly once per webview lifetime.
const vscodeApi = window.acquireVsCodeApi();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in the webview DOM.');
}

const root = createRoot(container);
root.render(
  <VsCodeApiProvider api={vscodeApi}>
    <App />
  </VsCodeApiProvider>
);
