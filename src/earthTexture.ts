import * as THREE from 'three';

/**
 * Procedural Earth texture — hand-painted continents on a 2D canvas using an
 * earthen palette. Equirectangular 2:1. Luminance is tuned so that the ASCII
 * downsample resolves land vs. sea clearly even after gamma correction.
 */
export function createEarthTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;

  // ---- Ocean: deep warm teal with latitudinal variation ----
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, '#16314a');
  og.addColorStop(0.18, '#0e4566');
  og.addColorStop(0.4, '#147f95');
  og.addColorStop(0.55, '#19a3b3');
  og.addColorStop(0.7, '#147f95');
  og.addColorStop(0.82, '#0e4566');
  og.addColorStop(1, '#16314a');
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, H);

  // ocean currents
  for (let s = 0; s < 8; s++) {
    const y0 = 70 + Math.random() * (H - 140);
    const amp = 15 + Math.random() * 30;
    ctx.strokeStyle = `rgba(140, 190, 195, ${0.04 + Math.random() * 0.04})`;
    ctx.lineWidth = 2 + Math.random() * 5;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= W; x += 12) {
      ctx.lineTo(x, y0 + Math.sin(x * 0.022 + s) * amp);
    }
    ctx.stroke();
  }
  // sparkle
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillStyle = `rgba(160, 200, 200, ${0.04 + Math.random() * 0.06})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + Math.random() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Continent painter ----
  // Input coordinates are 2048×1024 native; we scale to the actual 1024×512 canvas.
  function landmass(points: number[][], density: number, jitter: number, palette: string[]) {
    const pts = points.map((p) => [p[0] * 0.5, p[1] * 0.5]);

    ctx.save();
    ctx.fillStyle = palette[0];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const x = pts[i][0];
      const y = pts[i][1];
      const px = pts[i - 1][0];
      const py = pts[i - 1][1];
      const cx = (x + px) / 2 + (Math.random() - 0.5) * 5;
      const cy = (y + py) / 2 + (Math.random() - 0.5) * 5;
      ctx.quadraticCurveTo(cx, cy, x, y);
    }
    ctx.closePath();
    ctx.fill();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i][0] < minX) minX = pts[i][0];
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    minX -= jitter;
    maxX += jitter;
    minY -= jitter;
    maxY += jitter;

    for (let i = 0; i < density; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      if (ctx.isPointInPath(x, y)) {
        ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
        ctx.globalAlpha = 0.55 + Math.random() * 0.4;
        ctx.beginPath();
        ctx.arc(
          x + (Math.random() - 0.5) * jitter,
          y + (Math.random() - 0.5) * jitter,
          0.4 + Math.random() * 1.3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  const P_NORTHAM = ['#7a5a3a', '#8a6845', '#a07a4f', '#5e6a3a', '#3d4d28', '#bfa478'];
  const P_SOUTHAM = ['#3d5a28', '#4f6e35', '#6e8a48', '#3a5530', '#8a8a4a'];
  const P_GREEN = ['#d8d0bc', '#c0b8a4', '#a59c8a'];
  const P_EUROPE = ['#6e7a48', '#5a6638', '#8a8055', '#a89060'];
  const P_AFRICA = ['#b07a3a', '#8a5f28', '#c4955a', '#5a6638', '#8a5a30'];
  const P_ARABIA = ['#c89868', '#a87850', '#b08858', '#8a6840'];
  const P_RUSSIA = ['#6a5d3f', '#52482e', '#7a8a55', '#9a8a60', '#b8b09a'];
  const P_EASIA = ['#6e7a48', '#5a6638', '#8a805a', '#a89060'];
  const P_INDIA = ['#8a6a40', '#6e552f', '#a07840', '#5a6638'];
  const P_SEASIA = ['#3d5a28', '#4f6e35', '#6e8a48'];
  const P_AUSTRAL = ['#a85e2f', '#8a4a22', '#b87040', '#6a3a1c', '#9a542a'];
  const P_NZ = ['#4f6e35', '#6e8a48'];
  const P_ANT = ['#e8e0c8', '#d4cdb8', '#b8b09a'];

  // North America
  landmass(
    [
      [180, 200],
      [330, 170],
      [470, 175],
      [560, 220],
      [600, 270],
      [610, 340],
      [580, 400],
      [520, 450],
      [480, 500],
      [430, 540],
      [380, 530],
      [340, 470],
      [300, 420],
      [260, 360],
      [220, 300],
      [200, 250],
    ],
    650,
    13,
    P_NORTHAM,
  );
  // Central America
  landmass(
    [
      [430, 540],
      [460, 570],
      [490, 600],
      [520, 620],
      [540, 640],
      [560, 660],
      [550, 670],
      [520, 660],
      [490, 640],
      [460, 610],
      [430, 580],
    ],
    150,
    5,
    P_SOUTHAM,
  );
  // South America
  landmass(
    [
      [600, 640],
      [680, 620],
      [740, 660],
      [770, 720],
      [780, 800],
      [760, 870],
      [720, 920],
      [670, 940],
      [630, 920],
      [610, 860],
      [600, 800],
      [590, 740],
      [590, 680],
    ],
    550,
    11,
    P_SOUTHAM,
  );
  // Greenland
  landmass(
    [
      [820, 130],
      [900, 110],
      [960, 130],
      [970, 180],
      [950, 230],
      [910, 250],
      [870, 240],
      [840, 200],
      [820, 160],
    ],
    200,
    7,
    P_GREEN,
  );
  // Europe
  landmass(
    [
      [1000, 240],
      [1080, 220],
      [1140, 230],
      [1180, 260],
      [1160, 290],
      [1130, 320],
      [1090, 340],
      [1050, 320],
      [1020, 290],
      [1000, 270],
    ],
    280,
    8,
    P_EUROPE,
  );
  // Africa
  landmass(
    [
      [1080, 420],
      [1160, 410],
      [1220, 440],
      [1250, 500],
      [1240, 580],
      [1210, 650],
      [1180, 720],
      [1140, 770],
      [1110, 790],
      [1080, 770],
      [1060, 720],
      [1050, 660],
      [1060, 600],
      [1070, 540],
      [1070, 480],
    ],
    700,
    12,
    P_AFRICA,
  );
  // Madagascar
  landmass(
    [
      [1270, 700],
      [1290, 690],
      [1300, 730],
      [1285, 760],
      [1270, 740],
    ],
    60,
    3,
    P_AFRICA,
  );
  // Arabia
  landmass(
    [
      [1200, 420],
      [1260, 415],
      [1300, 450],
      [1310, 490],
      [1290, 520],
      [1250, 510],
      [1220, 480],
      [1200, 450],
    ],
    190,
    7,
    P_ARABIA,
  );
  // Russia / N. Asia
  landmass(
    [
      [1150, 200],
      [1300, 180],
      [1450, 175],
      [1600, 180],
      [1750, 200],
      [1850, 220],
      [1900, 260],
      [1880, 300],
      [1820, 320],
      [1730, 330],
      [1620, 320],
      [1500, 310],
      [1380, 300],
      [1280, 290],
      [1200, 270],
      [1160, 240],
    ],
    1100,
    15,
    P_RUSSIA,
  );
  // China / E. Asia
  landmass(
    [
      [1500, 340],
      [1620, 330],
      [1700, 360],
      [1730, 410],
      [1720, 460],
      [1680, 480],
      [1620, 470],
      [1560, 450],
      [1520, 410],
      [1500, 370],
    ],
    450,
    10,
    P_EASIA,
  );
  // India
  landmass(
    [
      [1450, 440],
      [1500, 440],
      [1530, 480],
      [1520, 540],
      [1490, 580],
      [1460, 560],
      [1440, 510],
      [1440, 470],
    ],
    280,
    8,
    P_INDIA,
  );
  // SE Asia archipelago
  landmass(
    [
      [1660, 530],
      [1700, 540],
      [1690, 560],
      [1660, 555],
    ],
    70,
    3,
    P_SEASIA,
  );
  landmass(
    [
      [1700, 580],
      [1740, 590],
      [1730, 615],
      [1700, 605],
    ],
    70,
    3,
    P_SEASIA,
  );
  landmass(
    [
      [1620, 590],
      [1680, 600],
      [1670, 625],
      [1620, 615],
    ],
    70,
    3,
    P_SEASIA,
  );
  landmass(
    [
      [1740, 620],
      [1790, 630],
      [1780, 660],
      [1740, 650],
    ],
    80,
    3,
    P_SEASIA,
  );
  // Australia
  landmass(
    [
      [1740, 700],
      [1830, 695],
      [1890, 720],
      [1900, 760],
      [1870, 790],
      [1810, 800],
      [1760, 790],
      [1730, 760],
      [1720, 730],
    ],
    400,
    9,
    P_AUSTRAL,
  );
  // New Zealand
  landmass(
    [
      [1930, 820],
      [1950, 810],
      [1955, 850],
      [1935, 855],
    ],
    50,
    3,
    P_NZ,
  );
  landmass(
    [
      [1955, 860],
      [1975, 855],
      [1980, 890],
      [1960, 895],
    ],
    50,
    3,
    P_NZ,
  );
  // Antarctica
  landmass(
    [
      [40, 940],
      [300, 920],
      [600, 935],
      [900, 930],
      [1200, 940],
      [1500, 930],
      [1800, 935],
      [2000, 945],
      [2000, 1010],
      [40, 1010],
    ],
    1000,
    9,
    P_ANT,
  );

  // mountain highlights
  ctx.fillStyle = 'rgba(232, 220, 190, 0.55)';
  const peaks: number[][] = [
    [380, 320, 40],
    [700, 770, 30],
    [1180, 480, 20],
    [1260, 540, 15],
    [1500, 350, 45],
    [1450, 460, 35],
    [1700, 380, 40],
    [1800, 730, 20],
  ];
  peaks.forEach((r) => {
    for (let i = 0; i < r[2]; i++) {
      const x = (r[0] + (Math.random() - 0.5) * 80) * 0.5;
      const y = (r[1] + (Math.random() - 0.5) * 60) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + Math.random() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // polar ice wash
  const pTop = ctx.createLinearGradient(0, 0, 0, 60);
  pTop.addColorStop(0, 'rgba(248, 240, 220, 0.55)');
  pTop.addColorStop(1, 'rgba(248, 240, 220, 0)');
  ctx.fillStyle = pTop;
  ctx.fillRect(0, 0, W, 60);
  const pBot = ctx.createLinearGradient(0, H - 60, 0, H);
  pBot.addColorStop(0, 'rgba(248, 240, 220, 0)');
  pBot.addColorStop(1, 'rgba(248, 240, 220, 0.55)');
  ctx.fillStyle = pBot;
  ctx.fillRect(0, H - 60, W, 60);

  // cloud wisps
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * H;
    const x = Math.random() * W;
    const w = 40 + Math.random() * 110;
    const h = 3 + Math.random() * 7;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.25);
    ctx.fillStyle = `rgba(245, 235, 215, ${0.04 + Math.random() * 0.07})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}
