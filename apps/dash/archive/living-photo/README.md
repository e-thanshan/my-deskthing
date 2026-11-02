# living photo

The home backdrop from 0.6.0 through 0.16.0: a still photo of a cottage, warped gently in WebGL so
the foliage sways and the sky drifts. The motion masks in `LivePhoto.tsx` (`paintMask`) are drawn
for this one photo and need redrawing for any other. `?mask` overlays them and `?amp=8` exaggerates
the motion.

This folder is outside the build and the typecheck. To bring it back:

1. Move `LivePhoto.tsx` to `src/components/` and `background.jpg` to `src/assets/`.
2. In `src/components/Backdrop.tsx`, render
   `<LivePhoto src={background} />` with `import background from '../assets/background.jpg'`.
