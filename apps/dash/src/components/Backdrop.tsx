import { CottageScene } from './CottageScene';
import { FallingLeaves } from './FallingLeaves';

// ---------------------------------------------------------------------------
// custom background image
//
// drop a landscape image (roughly 800x480 or larger) into src/assets/ and
// import it here, then point BACKGROUND_IMAGE at it:
//
//   import background from '../assets/background.jpg';
//   const BACKGROUND_IMAGE: string | null = background;
//
// the build inlines the file into the app bundle, so it works offline on the
// device. a plain 'https://...' string also renders in a desktop browser
// preview, but the car thing's webview has no direct internet, so a url shows
// nothing on the device itself - bundle the file instead.
//
// leave it null to keep the painted cottage scene. falling leaves stay on top
// either way; delete <FallingLeaves /> below if you want the image bare.
// ---------------------------------------------------------------------------
const BACKGROUND_IMAGE: string | null = null;

export function Backdrop() {
  return (
    <div aria-hidden className="absolute inset-0">
      {BACKGROUND_IMAGE ? (
        <img src={BACKGROUND_IMAGE} alt="" className="h-full w-full object-cover" />
      ) : (
        <CottageScene />
      )}
      <FallingLeaves />
    </div>
  );
}
