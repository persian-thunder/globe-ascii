/**
 * Glyph atlas — pre-rasterizes every character in the ramp into a single
 * canvas, then extracts a Uint32Array per glyph where each pixel is either
 * `alpha << 24` (visible) or `0` (transparent / skip).
 *
 * This is the core of the perf story: per-frame ASCII rendering uses bitwise
 * OR to blend glyph alpha with a packed RGB color, so there's no fillText,
 * no fillStyle, no string allocation, and no font-cache miss in the hot loop.
 */

export interface GlyphAtlas {
  cellW: number;
  cellH: number;
  glyphs: Uint32Array[];
}

const FONT_FAMILY = "'JetBrains Mono', ui-monospace, Menlo, monospace";

export function buildGlyphAtlas(
  charset: string,
  fontSizePx: number,
  lineHeight: number,
): GlyphAtlas {
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = `500 ${fontSizePx}px ${FONT_FAMILY}`;
  const cellW = Math.max(1, Math.round(probe.measureText('M').width));
  const cellH = Math.max(1, Math.round(fontSizePx * lineHeight));

  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = cellW * charset.length;
  atlasCanvas.height = cellH;
  const ctx = atlasCanvas.getContext('2d')!;
  ctx.font = `500 ${fontSizePx}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';

  for (let i = 0; i < charset.length; i++) {
    const ch = charset[i];
    const advance = probe.measureText(ch).width;
    const xOffset = (cellW - advance) / 2;
    ctx.fillText(ch, i * cellW + xOffset, 0);
  }

  const atlasImg = ctx.getImageData(0, 0, atlasCanvas.width, atlasCanvas.height);
  const atlasData = atlasImg.data;

  // Pre-shift alpha into the high byte (RGBA little-endian: AABBGGRR)
  // so we can OR with a packed RGB later — single 32-bit write per pixel.
  const glyphs: Uint32Array[] = [];
  for (let g = 0; g < charset.length; g++) {
    const arr = new Uint32Array(cellW * cellH);
    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        const ai = (y * atlasCanvas.width + g * cellW + x) * 4 + 3;
        const a = atlasData[ai];
        if (a > 0) arr[y * cellW + x] = a << 24;
      }
    }
    glyphs.push(arr);
  }

  return { cellW, cellH, glyphs };
}
