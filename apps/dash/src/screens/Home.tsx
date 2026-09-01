import { useConnection } from '../bridge';
import { Clock } from '../components/Clock';
import { NowPlaying } from '../components/NowPlaying';
import { ProgressBar } from '../components/ProgressBar';
import { usePlayer } from '../hooks/usePlayer';

export default function Home() {
  const conn = useConnection();
  const { track, positionMs, durationMs } = usePlayer();

  return (
    <div className="flex h-full w-full flex-col bg-bg p-10 text-off-white">
      <div className="flex justify-end">
        <Clock />
      </div>
      <div className="flex flex-1 items-center">
        <NowPlaying conn={conn} track={track} />
      </div>
      <ProgressBar positionMs={positionMs} durationMs={durationMs} />
    </div>
  );
}
