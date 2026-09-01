import { useConnection } from '../bridge';
import { Backdrop } from '../components/Backdrop';
import { Clock } from '../components/Clock';
import { NowPlaying } from '../components/NowPlaying';
import { ProgressBar } from '../components/ProgressBar';
import { usePlayer } from '../hooks/usePlayer';

export default function Home() {
  const conn = useConnection();
  const { track, positionMs, durationMs, playing } = usePlayer();

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-off-white">
      <Backdrop />
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="relative flex h-full w-full flex-col p-8">
        <div className="flex items-start">
          <div className="min-w-0 flex-1">
            <NowPlaying conn={conn} track={track} />
          </div>
          <div className="shrink-0 pl-6">
            <Clock />
          </div>
        </div>
        <div className="flex-1" />
        <ProgressBar positionMs={positionMs} durationMs={durationMs} playing={playing} />
      </div>
    </div>
  );
}
