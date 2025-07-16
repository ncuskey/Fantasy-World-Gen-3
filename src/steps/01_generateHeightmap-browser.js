/**
 * Step 1: Generate Heightmap (Browser Version)
 * 
 * This step creates a base heightmap using noise algorithms to generate
 * realistic terrain elevation data on a hex grid.
 * 
 * Browser-specific version using CDN imports.
 */

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

// Import the new hex grid generator
import { createHexGrid } from '../grid/hexGrid.js';

// Import the new pixel conversion utilities
import { hexToPixelFlatOffset } from '../utils/hexToPixel.js';

/**
 * Convert hex coordinates to pixel coordinates for noise sampling.
 * Uses even-q offset coordinates for flat-topped orientation.
 *
 * @param {HexCell} hex - Hex cell coordinates (with col, row, q, r)
 * @param {number} hexSize - Size of each hex
 * @returns {{ x: number, y: number }} Pixel coordinates
 */
function hexToPixel(hex, hexSize) {
  return hexToPixelFlatOffset({ col: hex.col, row: hex.row }, hexSize);
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
  const centerCol = Math.floor(gridWidth / 2);
  const centerRow = Math.floor(gridHeight / 2);
  const centerHex = { col: centerCol, row: centerRow, q: centerCol, r: centerRow - Math.floor(centerCol / 2) };
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

export default generateHeightmap; 