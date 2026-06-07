# globe-ascii

Real-time ASCII Earth for Hope Hydration. React + TypeScript, bundled via CRACO. Sibling project to [`droplet-ascii`](https://github.com/persian-thunder/droplet-ascii).

## Requirements

- Node 18 or 20
- Yarn (`npm i -g yarn` if you don't have it)

## Setup

```bash
yarn install
```

## Run

```bash
yarn start    # dev server with hot reload at http://localhost:3000
yarn build    # production bundle to ./build
```

## Controls

| Action       | Result                       |
|--------------|------------------------------|
| Drag         | Orbit camera around planet   |
| Scroll       | Zoom (clamped 3.2 – 18 units)|
| Double-click | Reset view                   |

## How it renders

The naive path: `ctx.fillText(char, x, y)` per cell, per frame. Thousands of font-shaping + glyph-rasterization + color-string parses. Why most ASCII renderers stutter.

This one:

1. Pre-rasterizes every glyph in the ramp into a strip canvas — **once**, at mount.
2. Extracts a `Uint32Array` per glyph where each pixel is `alpha << 24` or `0`.
3. Each frame: WebGL renders Earth into a small offscreen target, `drawImage` downsamples to the ASCII grid, `getImageData` reads pixels.
4. Per ASCII cell: pack the chosen RGB into `(b<<16) | (g<<8) | r`, then the inner loop is `if (ash) out32[i] = ash | color`.
5. One `putImageData` writes the whole buffer to the visible canvas.

No `fillText`, no `fillStyle`, no string allocation, no font-cache miss in the hot path.

## Project layout

```
src/
├── index.tsx          React entry
├── App.tsx            Root component (halo + stage)
├── EarthASCII.tsx     Main component — Three.js scene + ASCII pipeline
├── earthTexture.ts    Procedural Earth painted to 2D canvas
└── glyphAtlas.ts      Pre-rasterized glyphs for fast pixel blits
```

## Deploy

`yarn build` produces a static bundle in `build/`. Drop it on any static host — Vercel, Netlify, GitHub Pages, S3, Cloudflare Pages.

```bash
yarn build
npx vercel --prod build
# or
npx netlify deploy --prod --dir=build
```

## License

MIT
