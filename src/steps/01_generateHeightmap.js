/**
 * Step 1: Generate Heightmap
 * 
 * This step creates a base heightmap using noise algorithms to generate
 * realistic terrain elevation data on a hex grid.
 */

// Conditional imports for Node.js vs Browser environments
let createNoise2D, seedrandom;

if (typeof window === 'undefined') {
  // Node.js environment - use local modules
  const simplexNoise = await import('simplex-noise');
  const seedrandomModule = await import('seedrandom');
  createNoise2D = simplexNoise.createNoise2D;
  seedrandom = seedrandomModule.default;
} else {
  // Browser environment - use CDN imports
  const simplexNoise = await import('https://cdn.skypack.dev/simplex-noise');
  const seedrandomModule = await import('https://cdn.skypack.dev/seedrandom');
  createNoise2D = simplexNoise.createNoise2D;
  seedrandom = seedrandomModule.default;
}

import { createHexGrid } from '../grid/hexGrid.js';               // even‑q offset grid generator
import { hexToPixelFlatOffset } from '../utils/hexToPixel.js';  // converts {col,row} → pixel

/**
 * @typedef {{ q: number, r: number, s: number }} HexCell
 * @typedef {{
 *   gridWidth: number,
 *   gridHeight: number,
 *   octaves: number,
 *   persistence: number,
 *   lacunarity: number,
 *   frequency: number,
 *   amplitude: number,
 *   gradientFalloff: 'circular'|'none',
 *   falloffCurve: 'linear'|'smooth'|'power',
 *   seaLevel?: number
 * }} HeightmapOptions
 */

/**
 * Generate a hex-grid and associated elevation data.
 *
 * @param {string} seed - Deterministic seed string
 * @param {HeightmapOptions} options - Generation options
 * @returns {Promise<{ hexGrid: HexCell[], heightMap: Float32Array }>}
 */
export async function generateHeightmap(seed, options) {
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
  if (typeof window !== 'undefined') {
    console.log('First hexGrid cell:', hexGrid[0]);
  }
  
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
  
  console.log(`Generated heightmap: ${hexGrid.length} hex cells with ${octaves} octaves`);
  return { hexGrid, heightMap };
}

// TODO: Add Vitest tests for consistency
// - Test deterministic output with same seed
// - Test hex grid generation with different dimensions
// - Test noise parameters (octaves, persistence, lacunarity)
// - Test gradient falloff curves
// - Test edge cases (single hex, very large grids)

export default generateHeightmap; 