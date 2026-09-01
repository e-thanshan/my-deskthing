import background from '../assets/background.jpg';
import { LivePhoto } from './LivePhoto';

// ---------------------------------------------------------------------------
// to change the background, replace src/assets/background.jpg (landscape,
// roughly 800x480 or larger; the build inlines it, so it works offline on the
// device - the webview has no direct internet, so never hot-link a url).
// the LivePhoto motion masks in LivePhoto.tsx are tuned to this photo and
// need re-tuning for a new one.
//
// false renders the image as a plain still; true warps it gently in webgl
// (drifting clouds, swaying foliage), falling back to the still on any failure
// ---------------------------------------------------------------------------
const ANIMATE_BACKGROUND = true;

export function Backdrop() {
  return (
    <div aria-hidden className="absolute inset-0">
      {ANIMATE_BACKGROUND ? (
        <LivePhoto src={background} />
      ) : (
        <img src={background} alt="" className="h-full w-full object-cover" />
      )}
    </div>
  );
}
