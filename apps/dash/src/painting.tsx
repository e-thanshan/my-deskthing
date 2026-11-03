import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { usePaintingFeed, type PaintingFeed } from './hooks/usePaintingFeed';

/** `KeyboardEvent.key` of the preset that opens the painting menu on a tap and peeks on a hold. */
export const PAINTING_KEY = '3';

/** How long the preset must be held before the interface fades away. */
export const PEEK_HOLD_MS = 500;

type PaintingApi = PaintingFeed & {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  /** True while the preset is held and everything but the painting and its credit is hidden. */
  peeking: boolean;
  setPeeking: (on: boolean) => void;
};

const PaintingContext = createContext<PaintingApi | null>(null);

export function PaintingProvider({ children }: { children: ReactNode }) {
  const feed = usePaintingFeed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const { clearStatus } = feed;

  // a status belongs to the menu that asked for it, so a reopened menu starts clean
  useEffect(() => {
    if (!menuOpen) clearStatus();
  }, [menuOpen, clearStatus]);

  const api = useMemo(() => ({ ...feed, menuOpen, setMenuOpen, peeking, setPeeking }), [feed, menuOpen, peeking]);
  return <PaintingContext.Provider value={api}>{children}</PaintingContext.Provider>;
}

export function usePainting(): PaintingApi {
  const api = useContext(PaintingContext);
  if (!api) throw new Error('usePainting outside PaintingProvider');
  return api;
}
