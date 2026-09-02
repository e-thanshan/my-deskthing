import { useCallback } from 'react';
import { useBridge } from '../bridge';
import { useDial } from './useDial';

export function useDialVolume(enabled = true) {
  const client = useBridge();
  const onDetent = useCallback(
    (dir: -1 | 1) => void (dir > 0 ? client.audio.volumeUp() : client.audio.volumeDown()),
    [client],
  );
  useDial(onDetent, enabled);
}
