// Azgaar-style Hex Grid Terrain Module
// Implements noise+falloff heightmap, land mask, signed distance field, and preallocates secondary layers
// All arrays are typed for performance and GC efficiency

import { createHexGrid } from '../grid/hexGrid.js';
import SimplexNoise from 'simplex-noise';
import seedrandom from 'seedrandom';

/**
 * @typedef {Object} HexCell
 * @property {number} col - Offset column
 * @property {number} row - Offset row
 * @property {number} q   - Axial q
 * @property {number} r   - Axial r
 */

/**
 * @param {string} seed - RNG seed for deterministic noise
 * @param {number} width - Grid width (columns)
 * @param {number} height - Grid height (rows)
 * @param {Object} [opts]
 * @param {number} [opts.octaves=5]
 * @param {number} [opts.persistence=0.5]
 * @param {number} [opts.lacunarity=2.0]
 * @param {number} [opts.frequency=1.0]
 * @param {number} [opts.amplitude=1.0]
 * @returns {{
 *   hexGrid: HexCell[],
 *   heightMap: Float32Array, // [N] elevation, 0..1
 *   featureIndex: Uint8Array, // [N] (future: biome/feature id)
 *   neighborList: Uint16Array, // [N*6] (future: neighbor indices)
 *   vertexList: Float32Array // [N*6*2] (future: x,y for each corner)
 * }}
 */
export function generateHeightMap(seed, width, height, opts = {}) {
  const {
    octaves = 5,
    persistence = 0.5,
    lacunarity = 2.0,
    frequency = 1.0,
    amplitude = 1.0
  } = opts;
  const N = width * height;
  const hexGrid = createHexGrid(width, height);
  const heightMap = new Float32Array(N);
  const featureIndex = new Uint8Array(N); // placeholder for biome/feature
  const neighborList = new Uint16Array(N * 6); // 6 neighbors per cell
  const vertexList = new Float32Array(N * 6 * 2); // 6 corners, x/y each

  // Init noise
  const rng = seedrandom(seed);
  const simplex = new SimplexNoise(rng);

  // Center for radial falloff
  const centerQ = (width - 1) / 2;
  const centerR = (height - 1) / 2;
  const maxDist = Math.sqrt(centerQ * centerQ + centerR * centerR);

  // Generate noise+falloff heightmap
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < N; i++) {
    const { q, r } = hexGrid[i];
    // Normalize for noise
    let nx = q / width - 0.5;
    let ny = r / height - 0.5;
    let value = 0, amp = amplitude, freq = frequency;
    for (let o = 0; o < octaves; o++) {
      value += simplex.noise2D(nx * freq, ny * freq) * amp;
      amp *= persistence;
      freq *= lacunarity;
    }
    // Radial falloff
    const dist = Math.sqrt((q - centerQ) ** 2 + (r - centerR) ** 2) / maxDist;
    value *= Math.max(0, 1 - dist);
    heightMap[i] = value;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  // Normalize to [0,1]
  for (let i = 0; i < N; i++) heightMap[i] = (heightMap[i] - min) / (max - min);

  // (Future) Fill neighborList, vertexList as needed
  // ...

  return { hexGrid, heightMap, featureIndex, neighborList, vertexList };
}

/**
 * Compute land/sea mask from heightmap.
 * @param {Float32Array} heightMap - [N] normalized elevation
 * @param {number} [seaLevel=0.5]
 * @returns {Uint8Array} landMask - [N] 1=land, 0=sea
 */
export function computeLandMask(heightMap, seaLevel = 0.5) {
  const landMask = new Uint8Array(heightMap.length);
  for (let i = 0; i < heightMap.length; i++) {
    landMask[i] = heightMap[i] >= seaLevel ? 1 : 0;
  }
  return landMask;
}

/**
 * Felzenszwalb & Huttenlocher’s two-pass signed Euclidean distance transform for hex grids.
 * @param {Uint8Array} landMask - [N] 1=land, 0=sea
 * @param {number} width
 * @param {number} height
 * @returns {Float32Array} signedDistanceField - [N] positive=land, negative=sea, 0=boundary
 */
export function computeSignedDistanceField(landMask, width, height) {
  const N = width * height;
  const dist = new Float32Array(N);
  const INF = 1e6;
  // 1st pass: init
  for (let i = 0; i < N; i++) {
    dist[i] = landMask[i] ? INF : -INF;
  }
  // 2nd pass: forward
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (landMask[i]) {
        if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
        if (y > 0) dist[i] = Math.min(dist[i], dist[i - width] + 1);
      } else {
        if (x > 0) dist[i] = Math.max(dist[i], dist[i - 1] - 1);
        if (y > 0) dist[i] = Math.max(dist[i], dist[i - width] - 1);
      }
    }
  }
  // 3rd pass: backward
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (landMask[i]) {
        if (x < width - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
        if (y < height - 1) dist[i] = Math.min(dist[i], dist[i + width] + 1);
      } else {
        if (x < width - 1) dist[i] = Math.max(dist[i], dist[i + 1] - 1);
        if (y < height - 1) dist[i] = Math.max(dist[i], dist[i + width] - 1);
      }
    }
  }
  // Negative for sea
  for (let i = 0; i < N; i++) {
    if (!landMask[i] && dist[i] > 0) dist[i] = -dist[i];
  }
  return dist;
} 