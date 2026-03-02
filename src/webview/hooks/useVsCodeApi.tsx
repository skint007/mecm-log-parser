import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import type { WebviewToHostMessage } from '../../shared/types.js';

interface VsCodeApi {
  postMessage(message: WebviewToHostMessage): void;
  getState<T = unknown>(): T | undefined;
  setState<T = unknown>(state: T): void;
}

const VsCodeApiContext = createContext<VsCodeApi | null>(null);

export function VsCodeApiProvider({
  api,
  children,
}: {
  api: VsCodeApi;
  children: ReactNode;
}) {
  return (
    <VsCodeApiContext.Provider value={api}>
      {children}
    </VsCodeApiContext.Provider>
  );
}

export function useVsCodeApi(): VsCodeApi {
  const ctx = useContext(VsCodeApiContext);
  if (!ctx) {
    throw new Error('useVsCodeApi must be used within a VsCodeApiProvider');
  }
  return ctx;
}

/**
 * Fires a `ready` message to the extension host once, after the component mounts.
 * This triggers the host to send parsed file data.
 */
export function useReadySignal(): void {
  const api = useVsCodeApi();
  useEffect(() => {
    api.postMessage({ type: 'ready' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
