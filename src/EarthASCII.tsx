import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createEarthTexture } from './earthTexture';
import { buildGlyphAtlas } from './glyphAtlas';
import './EarthASCII.css';

const ASCII_COLS = 160;
const ASCII_ROWS = 88;
const CHARSET = ' 0123456789ABCDEF';
const CHARSET_LEN = CHARSET.length;
const FONT_SIZE_PX = 11;
const LINE_HEIGHT = 0.96;

// Camera orbit constants
const DRAG_SENS = 0.0065;
const ZOOM_SENS = 0.0028;
const FRICTION = 0.92;
const MIN_DIST = 3.2;
const MAX_DIST = 18;
const PHI_MIN = 0.1;
const PHI_MAX = Math.PI - 0.1;
const DEFAULT_DIST = 8.6;

// Scene constants
const EARTH_R = 1.62;
const SPIN = 0.08;

export default function EarthASCII() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ----- Glyph atlas (pre-rendered once) -----
    const atlas = buildGlyphAtlas(CHARSET, FONT_SIZE_PX, LINE_HEIGHT);
    const { cellW: CELL_W, cellH: CELL_H, glyphs: GLYPHS } = atlas;

    // ----- Output canvas -----
    const OUT_W = ASCII_COLS * CELL_W;
    const OUT_H = ASCII_ROWS * CELL_H;
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    canvas.style.width = `${OUT_W}px`;
    canvas.style.height = `${OUT_H}px`;
    const outCtx = canvas.getContext('2d')!;
    const outImg = outCtx.createImageData(OUT_W, OUT_H);
    const out32 = new Uint32Array(outImg.data.buffer);

    // ----- Luminance → glyph lookup table -----
    const LUM_TO_GLYPH = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let v = Math.pow(i / 255, 0.82);
      if (v > 1) v = 1;
      LUM_TO_GLYPH[i] = Math.min(CHARSET_LEN - 1, Math.floor(v * CHARSET_LEN));
    }

    // ----- WebGL scene -----
    const displayAspect = (ASCII_COLS * CELL_W) / (ASCII_ROWS * CELL_H);
    const RENDER_W = ASCII_COLS * 4;
    const RENDER_H = ASCII_ROWS * 4;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(28, displayAspect, 0.1, 100);

    const sun = new THREE.DirectionalLight(0xffe6b8, 1.7);
    sun.position.set(5, 1.6, 4);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x6e88a5, 0.55);
    rim.position.set(-5, -1, -3);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x2a2218, 0.55));

    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = THREE.MathUtils.degToRad(23.44);
    scene.add(earthGroup);

    const earthTexture = createEarthTexture();
    const earthGeometry = new THREE.SphereGeometry(EARTH_R, 48, 48);
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.94,
      metalness: 0.04,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);

    const atmoGeometry = new THREE.SphereGeometry(EARTH_R * 1.045, 32, 32);
    const atmoMaterial = new THREE.MeshBasicMaterial({
      color: 0xc98a52,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    });
    const atmo = new THREE.Mesh(atmoGeometry, atmoMaterial);
    earthGroup.add(atmo);

    // ----- Camera orbit state (refs so they survive frames without re-renders) -----
    let camTheta = 0;
    let camPhi = Math.PI / 2;
    let camDist = DEFAULT_DIST;
    let velTheta = 0;
    let velPhi = 0;

    function updateCamera() {
      const sp = Math.sin(camPhi);
      camera.position.set(
        camDist * sp * Math.sin(camTheta),
        camDist * Math.cos(camPhi),
        camDist * sp * Math.cos(camTheta),
      );
      camera.lookAt(0, 0, 0);
    }
    updateCamera();

    // ----- Pointer + wheel handlers -----
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      canvas.classList.add('grabbing');
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      lastX = e.clientX;
      lastY = e.clientY;
      velTheta = 0;
      velPhi = 0;
      e.preventDefault();
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      velTheta = -dx * DRAG_SENS;
      velPhi = -dy * DRAG_SENS;
      e.preventDefault();
    };
    const endDrag = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      canvas.classList.remove('grabbing');
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };
    const handleWheel = (e: WheelEvent) => {
      camDist += e.deltaY * ZOOM_SENS;
      if (camDist < MIN_DIST) camDist = MIN_DIST;
      else if (camDist > MAX_DIST) camDist = MAX_DIST;
      e.preventDefault();
    };
    const handleDoubleClick = () => {
      camTheta = 0;
      camPhi = Math.PI / 2;
      camDist = DEFAULT_DIST;
      velTheta = 0;
      velPhi = 0;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);

    // ----- WebGL renderer (offscreen — never appended to DOM) -----
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setSize(RENDER_W, RENDER_H);
    renderer.setClearColor(0x000000, 0);

    // Downsample canvas
    const ds = document.createElement('canvas');
    ds.width = ASCII_COLS;
    ds.height = ASCII_ROWS;
    const dsCtx = ds.getContext('2d', { willReadFrequently: true })!;

    // ----- Window resize → CSS transform (no canvas realloc) -----
    const handleResize = () => {
      const scale = Math.min(
        (window.innerWidth * 0.92) / OUT_W,
        (window.innerHeight * 0.92) / OUT_H,
        1.6,
      );
      canvas.style.transform = `scale(${scale})`;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // ----- Frame loop -----
    const startTime = performance.now();
    let rafId = 0;
    let running = true;

    const frame = () => {
      if (!running) return;
      const t = (performance.now() - startTime) / 1000;

      // ambient self-spin
      earth.rotation.y = t * SPIN;

      // orbit momentum
      camTheta += velTheta;
      camPhi += velPhi;
      if (camPhi < PHI_MIN) {
        camPhi = PHI_MIN;
        velPhi = 0;
      } else if (camPhi > PHI_MAX) {
        camPhi = PHI_MAX;
        velPhi = 0;
      }
      if (!isDragging) {
        velTheta *= FRICTION;
        velPhi *= FRICTION;
        if (Math.abs(velTheta) < 0.00005) velTheta = 0;
        if (Math.abs(velPhi) < 0.00005) velPhi = 0;
      }
      updateCamera();

      renderer.render(scene, camera);
      dsCtx.drawImage(renderer.domElement, 0, 0, ASCII_COLS, ASCII_ROWS);
      const img = dsCtx.getImageData(0, 0, ASCII_COLS, ASCII_ROWS).data;

      // Clear output
      out32.fill(0);

      // Blit cells
      for (let y = 0; y < ASCII_ROWS; y++) {
        const cellRowOff = y * CELL_H * OUT_W;
        for (let x = 0; x < ASCII_COLS; x++) {
          const i = (y * ASCII_COLS + x) * 4;
          const a = img[i + 3];
          if (a < 12) continue;

          let r = img[i];
          let g = img[i + 1];
          let b = img[i + 2];

          const lumByte = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
          if (lumByte < 8) continue;

          // saturation lift (organic, gentle)
          const avg = (r + g + b) * (1 / 3);
          r = avg + (r - avg) * 1.55 + 12;
          g = avg + (g - avg) * 1.55 + 8;
          b = avg + (b - avg) * 1.55 + 2;
          if (r < 0) r = 0;
          else if (r > 255) r = 255;
          if (g < 0) g = 0;
          else if (g > 255) g = 255;
          if (b < 0) b = 0;
          else if (b > 255) b = 255;

          const glyphIdx = LUM_TO_GLYPH[lumByte];
          if (glyphIdx === 0) continue;

          const colorPacked = ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
          const glyph = GLYPHS[glyphIdx];
          const dstX = x * CELL_W;

          for (let py = 0; py < CELL_H; py++) {
            let sIdx = py * CELL_W;
            let dIdx = cellRowOff + py * OUT_W + dstX;
            for (let px = 0; px < CELL_W; px++) {
              const ash = glyph[sIdx];
              if (ash !== 0) out32[dIdx] = ash | colorPacked;
              sIdx++;
              dIdx++;
            }
          }
        }
      }

      outCtx.putImageData(outImg, 0, 0);

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    // ----- Cleanup -----
    return () => {
      running = false;
      cancelAnimationFrame(rafId);

      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('dblclick', handleDoubleClick);

      // dispose Three.js
      earthGeometry.dispose();
      earthMaterial.dispose();
      earthTexture.dispose();
      atmoGeometry.dispose();
      atmoMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="ascii-earth" />;
}
