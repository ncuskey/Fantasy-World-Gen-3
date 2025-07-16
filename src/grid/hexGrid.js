/**
 * Hex Grid Generator for Fantasy World Map
 * 
 * Uses even-q offset coordinates for true rectangular layout.
 * Each cell has both offset coordinates (col, row) and axial coordinates (q, r).
 */

/**
 * Create a W×H hex grid in even‑q offset coordinates.
 * Each cell has:
 *  - col, row: offset coords (for rectangular bounds)
 *  - q, r: axial coords for algorithms (q = col, r = row - floor(col/2))
 * 
 * @param {number} W - Width (number of columns)
 * @param {number} H - Height (number of rows)
 * @returns {Array<{col: number, row: number, q: number, r: number}>} Array of hex cells
 */
export function createHexGrid(W, H) {
  const cells = [];
  for (let col = 0; col < W; col++) {
    for (let row = 0; row < H; row++) {
      const q = col;
      const r = row - Math.floor(col / 2);
      cells.push({ col, row, q, r });
    }
  }
  return cells;
}

/**
 * Get the neighbors of a hex cell in even-q offset coordinates.
 * Returns the 6 adjacent cells (if they exist within the grid bounds).
 * 
 * @param {{col: number, row: number}} cell - The hex cell
 * @param {number} W - Grid width
 * @param {number} H - Grid height
 * @returns {Array<{col: number, row: number}>} Array of neighbor cells
 */
export function getNeighbors(cell, W, H) {
  const { col, row } = cell;
  const neighbors = [];
  
  // Even-q offset neighbor directions
  const directions = [
    [1, 0],   // E
    [1, -1],  // NE
    [0, -1],  // NW
    [-1, -1], // W
    [-1, 0],  // SW
    [0, 1]    // SE
  ];
  
  for (const [dCol, dRow] of directions) {
    const newCol = col + dCol;
    const newRow = row + dRow;
    
    // Check bounds
    if (newCol >= 0 && newCol < W && newRow >= 0 && newRow < H) {
      neighbors.push({ col: newCol, row: newRow });
    }
  }
  
  return neighbors;
}

/**
 * Calculate the distance between two hex cells using axial coordinates.
 * 
 * @param {{q: number, r: number}} cell1 - First cell
 * @param {{q: number, r: number}} cell2 - Second cell
 * @returns {number} Distance in hex steps
 */
export function hexDistance(cell1, cell2) {
  const dq = cell1.q - cell2.q;
  const dr = cell1.r - cell2.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/**
 * Convert offset coordinates to axial coordinates.
 * 
 * @param {number} col - Column (offset coordinate)
 * @param {number} row - Row (offset coordinate)
 * @returns {{q: number, r: number}} Axial coordinates
 */
export function offsetToAxial(col, row) {
  const q = col;
  const r = row - Math.floor(col / 2);
  return { q, r };
}

/**
 * Convert axial coordinates to offset coordinates.
 * 
 * @param {number} q - Q coordinate (axial)
 * @param {number} r - R coordinate (axial)
 * @returns {{col: number, row: number}} Offset coordinates
 */
export function axialToOffset(q, r) {
  const col = q;
  const row = r + Math.floor(q / 2);
  return { col, row };
} 