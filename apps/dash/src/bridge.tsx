import { BridgethingClient, type ConnectionState } from '@bridgething/client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { daemonUrl } from './daemon';

const BridgeContext = createContext<BridgethingClient | null>(null);

export function BridgeProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new BridgethingClient({ url: daemonUrl() }), []);
  return <BridgeContext.Provider value={client}>{children}</BridgeContext.Provider>;
}

export function useBridge(): BridgethingClient {
  const client = useContext(BridgeContext);
  if (!client) throw new Error('useBridge outside BridgeProvider');
  return client;
}

export function useConnection(): ConnectionState {
  const client = useBridge();
  const [state, setState] = useState<ConnectionState>(client.connectionState);
  useEffect(
    () =>
      client.on(event => {
        if (event.type === 'open' || event.type === 'close' || event.type === 'connecting') {
          setState(client.connectionState);
        }
      }),
    [client],
  );
  return state;
}
