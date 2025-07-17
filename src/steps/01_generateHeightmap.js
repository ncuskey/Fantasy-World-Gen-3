/**
 * Step 1: Generate Heightmap
 * 
 * This step creates a base heightmap using noise algorithms to generate
 * realistic terrain elevation data on a hex grid.
 */

import { generateHeightmapCore } from '../utils/generateHeightmapCore.js';

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
  return generateHeightmapCore(seed, options, { createNoise2D, seedrandom });
}

// TODO: Add Vitest tests for consistency
// - Test deterministic output with same seed
// - Test hex grid generation with different dimensions
// - Test noise parameters (octaves, persistence, lacunarity)
// - Test gradient falloff curves
// - Test edge cases (single hex, very large grids)

export default generateHeightmap; 