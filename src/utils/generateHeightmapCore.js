/**
 * Shared core logic for heightmap generation (Node & browser).
 *
 * Usage:
 *   import { generateHeightmapCore } from "../utils/generateHeightmapCore.js";
 *   // In Node: pass { createNoise2D, seedrandom } from local modules
 *   // In browser: pass { createNoise2D, seedrandom } from CDN
 *
 *   const { hexGrid, heightMap } = generateHeightmapCore(seed, options, { createNoise2D, seedrandom });
 *
 * - Returns hexGrid: Array of {col,row,q,r}
 * - Returns heightMap: Float32Array, normalized [0,1]
 * - No side effects, no logging, no imports of noise/seedrandom
 */
import { createHexGrid } from '../grid/hexGrid.js';
import { hexToPixelFlatOffset } from '../utils/hexToPixel.js';

/**
 * @param {string} seed
 * @param {object} options
 * @param {object} deps - { createNoise2D, seedrandom }
 * @returns {{ hexGrid: Array<{col:number,row:number,q:number,r:number}>, heightMap: Float32Array }}
 */
export function generateHeightmapCore(seed, options, { createNoise2D, seedrandom }) {
  const {
    gridWidth = 64,
    gridHeight = 64,
    octaves = 6,
    persistence = 0.5,
    lacunarity = 2.0,
    frequency = 1.0,
    amplitude = 1.0,
    gradientFalloff = 'circular',
    falloffCurve = 'linear',
    seaLevel = 0.3
  } = options;

  // Initialize noise with seed
  const rng = seedrandom(seed);
  const noise2D = createNoise2D(rng);

  // Create an even‑q offset grid with {col,row,q,r}
  const hexGrid = createHexGrid(gridWidth, gridHeight);

  // Calculate hex size based on grid dimensions
  const hexSize = Math.min(1.0 / gridWidth, 1.0 / gridHeight) * 2;

  // Initialize heightmap as Float32Array
  const heightMap = new Float32Array(hexGrid.length);

  // Center for radial gradient
  const centerCol = Math.floor(gridWidth / 2);
  const centerRow = Math.floor(gridHeight / 2);
  const centerHex = { col: centerCol, row: centerRow, q: centerCol, r: centerRow - Math.floor(centerCol / 2) };
  const { x: centerX, y: centerY } = hexToPixelFlatOffset(centerHex, hexSize);
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  let min = Infinity;
  let max = -Infinity;

  // Generate elevation for each hex
  for (let i = 0; i < hexGrid.length; i++) {
    const hex = hexGrid[i];
    const { x: px, y: py } = hexToPixelFlatOffset(hex, hexSize);

    // Normalize coordinates for noise sampling
    let nx = px / (gridWidth * hexSize) - 0.5;
    let ny = py / (gridHeight * hexSize) - 0.5;
    let value = 0;
    let amp = amplitude;
    let freq = frequency;

    // Multi-octave Simplex noise
    for (let o = 0; o < octaves; o++) {
      value += noise2D(nx * freq, ny * freq) * amp;
      amp *= persistence;
      freq *= lacunarity;
    }

    // Apply radial gradient for island effect
    if (gradientFalloff === 'circular') {
      const dx = px - centerX;
      const dy = py - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      let falloff = 1;

      switch (falloffCurve) {
        case 'smooth': {
          // smoothstep: 1 - (3t^2 - 2t^3)
          const t = dist;
          falloff = 1 - (3 * t * t - 2 * t * t * t);
          break;
        }
        case 'power': {
          falloff = Math.pow(1 - dist, 2);
          break;
        }
        case 'linear':
        default: {
          falloff = 1 - dist;
          break;
        }
      }
      value *= Math.max(0, falloff);
    }

    heightMap[i] = value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  // Normalize to [0, 1]
  for (let i = 0; i < heightMap.length; i++) {
    heightMap[i] = (heightMap[i] - min) / (max - min);
  }

  return { hexGrid, heightMap };
} 