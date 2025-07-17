/**
 * Step 1: Generate Heightmap (Browser Version)
 * 
 * This step creates a base heightmap using noise algorithms to generate
 * realistic terrain elevation data on a hex grid.
 * 
 * Browser-specific version using CDN imports.
 */

import { generateHeightmapCore } from '../utils/generateHeightmapCore.js';
import { generateHeightmapAzgaar } from './01_generateHeightmap.js';

// Use CDN imports for browser compatibility
import { createNoise2D } from 'https://cdn.skypack.dev/simplex-noise';
import seedrandom from 'https://cdn.skypack.dev/seedrandom';

/**
 * @typedef {{ col: number, row: number, q: number, r: number }} HexCell
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

export function generateHeightmap(seed, options) {
  return generateHeightmapCore(seed, options, { createNoise2D, seedrandom });
}

export { generateHeightmapAzgaar };

export default generateHeightmap; 