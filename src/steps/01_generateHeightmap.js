/**
 * Step 1: Generate Heightmap
 * 
 * This step creates a base heightmap using noise algorithms to generate
 * realistic terrain elevation data on a hex grid.
 */

// Use CDN versions for browser compatibility
import { createNoise2D } from 'https://cdn.skypack.dev/simplex-noise';
import seedrandom from 'https://cdn.skypack.dev/seedrandom';

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
 * Create a hex grid with the specified dimensions.
 * Uses axial coordinate system (q, r, s) where q + r + s = 0.
 *
 * @param {number} gridWidth - Number of hex columns
 * @param {number} gridHeight - Number of hex rows
 * @returns {HexCell[]} Array of hex cells with axial coordinates
 */
function createHexGrid(gridWidth, gridHeight) {
  const hexGrid = [];
  
  for (let r = 0; r < gridHeight; r++) {
    const rOffset = Math.floor(r / 2);
    const qStart = -rOffset;
    const qEnd = gridWidth - rOffset;
    
    for (let q = qStart; q < qEnd; q++) {
      const s = -q - r;
      hexGrid.push({ q, r, s });
    }
  }
  
  return hexGrid;
}

/**
 * Convert hex coordinates to pixel coordinates for noise sampling.
 *
 * @param {HexCell} hex - Hex cell coordinates
 * @param {number} hexSize - Size of each hex
 * @returns {{ x: number, y: number }} Pixel coordinates
 */
function hexToPixel(hex, hexSize) {
  const x = hexSize * (Math.sqrt(3) * hex.q + Math.sqrt(3) / 2 * hex.r);
  const y = hexSize * (3 / 2 * hex.r);
  return { x, y };
}

/**
 * Generate a hex-grid and associated elevation data.
 *
 * @param {string} seed - Deterministic seed string
 * @param {HeightmapOptions} options - Generation options
 * @returns {{ hexGrid: HexCell[], heightMap: Float32Array }}
 */
export function generateHeightmap(seed, options) {
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
  
  // Create hex grid
  const hexGrid = createHexGrid(gridWidth, gridHeight);
  
  // Calculate hex size based on grid dimensions
  const hexSize = Math.min(1.0 / gridWidth, 1.0 / gridHeight) * 2;
  
  // Initialize heightmap as Float32Array
  const heightMap = new Float32Array(hexGrid.length);
  
  // Center for radial gradient
  const centerHex = { q: gridWidth / 2, r: gridHeight / 2, s: -gridWidth / 2 - gridHeight / 2 };
  const centerPixel = hexToPixel(centerHex, hexSize);
  const maxDist = Math.sqrt(centerPixel.x * centerPixel.x + centerPixel.y * centerPixel.y);
  
  let min = Infinity;
  let max = -Infinity;
  
  // Generate elevation for each hex
  for (let i = 0; i < hexGrid.length; i++) {
    const hex = hexGrid[i];
    const pixel = hexToPixel(hex, hexSize);
    
    // Normalize coordinates for noise sampling
    let nx = pixel.x / (gridWidth * hexSize) - 0.5;
    let ny = pixel.y / (gridHeight * hexSize) - 0.5;
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
      const dx = pixel.x - centerPixel.x;
      const dy = pixel.y - centerPixel.y;
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