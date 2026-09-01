import background from '../assets/background.jpg';
import { CottageScene } from './CottageScene';
import { LivePhoto } from './LivePhoto';

// ---------------------------------------------------------------------------
// custom background image
//
// drop a landscape image (roughly 800x480 or larger) into src/assets/ and
// import it here, then point BACKGROUND_IMAGE at it. the build inlines the
// file into the app bundle, so it works offline on the device. a plain
// 'https://...' string also renders in a desktop browser preview, but the car
// thing's webview has no direct internet, so a url shows nothing on the
// device itself - bundle the file instead.
//
// set it to null for the painted cottage scene with animated smoke. for
// falling leaves over the image, render <FallingLeaves /> after the img.
// ---------------------------------------------------------------------------
const BACKGROUND_IMAGE: string | null = background;

// false renders the image as a plain still; true warps it gently in webgl
// (drifting clouds, swaying foliage), falling back to the still on any failure
const ANIMATE_BACKGROUND = true;

export function Backdrop() {
  return (
    <div aria-hidden className="absolute inset-0">
      {BACKGROUND_IMAGE ? (
        ANIMATE_BACKGROUND ? (
          <LivePhoto src={BACKGROUND_IMAGE} />
        ) : (
          <img src={BACKGROUND_IMAGE} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        <CottageScene />
      )}
    </div>
  );
}
