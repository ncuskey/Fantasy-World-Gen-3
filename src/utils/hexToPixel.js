/**
 * Hex to Pixel Conversion Utilities
 * 
 * Functions to convert hex grid coordinates to pixel coordinates
 * for both flat-topped and pointy-topped hexagon orientations.
 */

/**
 * Convert an even‑q offset hex to pixel (flat‑topped orientation).
 * @param {{col:number,row:number}} cell - Hex cell in offset coordinates
 * @param {number} size - Distance from center to flat side
 * @returns {{x:number,y:number}} Pixel coordinates
 */
export function hexToPixelFlatOffset({ col, row }, size) {
  const x = 1.5 * size * col;
  const y = Math.sqrt(3) * size * (row + 0.5 * (col & 1));
  return { x, y };
}

/**
 * Convert an even‑r offset hex to pixel (pointy‑topped orientation).
 * @param {{col:number,row:number}} cell - Hex cell in offset coordinates
 * @param {number} size - Distance from center to point
 * @returns {{x:number,y:number}} Pixel coordinates
 */
export function hexToPixelPointyOffset({ col, row }, size) {
  const x = Math.sqrt(3) * size * (col + 0.5 * (row & 1));
  const y = 1.5 * size * row;
  return { x, y };
}

/**
 * Convert pixel coordinates back to hex grid coordinates (flat-topped).
 * @param {{x:number,y:number}} pixel - Pixel coordinates
 * @param {number} size - Distance from center to flat side
 * @returns {{col:number,row:number}} Hex cell in offset coordinates
 */
export function pixelToHexFlatOffset({ x, y }, size) {
  const q = (2/3) * x / size;
  const r = (-1/3) * x / size + (Math.sqrt(3)/3) * y / size;
  
  // Convert axial to offset
  const col = Math.round(q);
  const row = Math.round(r + q/2);
  
  return { col, row };
}

/**
 * Convert pixel coordinates back to hex grid coordinates (pointy-topped).
 * @param {{x:number,y:number}} pixel - Pixel coordinates
 * @param {number} size - Distance from center to point
 * @returns {{col:number,row:number}} Hex cell in offset coordinates
 */
export function pixelToHexPointyOffset({ x, y }, size) {
  const q = (Math.sqrt(3)/3) * x / size - (1/3) * y / size;
  const r = (2/3) * y / size;
  
  // Convert axial to offset
  const col = Math.round(q);
  const row = Math.round(r + q/2);
  
  return { col, row };
}

/**
 * Calculate the bounds of a hex grid in pixel space (flat-topped).
 * @param {number} W - Grid width (columns)
 * @param {number} H - Grid height (rows)
 * @param {number} size - Hex size
 * @returns {{minX:number, maxX:number, minY:number, maxY:number}} Bounds
 */
export function getGridBoundsFlat(W, H, size) {
  const minX = 0;
  const maxX = 1.5 * size * (W - 1);
  const minY = 0;
  const maxY = Math.sqrt(3) * size * (H - 0.5);
  
  return { minX, maxX, minY, maxY };
}

/**
 * Calculate the bounds of a hex grid in pixel space (pointy-topped).
 * @param {number} W - Grid width (columns)
 * @param {number} H - Grid height (rows)
 * @param {number} size - Hex size
 * @returns {{minX:number, maxX:number, minY:number, maxY:number}} Bounds
 */
export function getGridBoundsPointy(W, H, size) {
  const minX = 0;
  const maxX = Math.sqrt(3) * size * (W - 0.5);
  const minY = 0;
  const maxY = 1.5 * size * (H - 1);
  
  return { minX, maxX, minY, maxY };
}

/**
 * Generate the points for drawing a flat-topped hexagon.
 * @param {{x:number,y:number}} center - Center point
 * @param {number} size - Distance from center to flat side
 * @returns {Array<{x:number,y:number}>} Array of 6 corner points
 */
export function getFlatHexPoints({ x, y }, size) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    points.push({
      x: x + size * Math.cos(angle),
      y: y + size * Math.sin(angle)
    });
  }
  return points;
}

/**
 * Generate the points for drawing a pointy-topped hexagon.
 * @param {{x:number,y:number}} center - Center point
 * @param {number} size - Distance from center to point
 * @returns {Array<{x:number,y:number}>} Array of 6 corner points
 */
export function getPointyHexPoints({ x, y }, size) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    points.push({
      x: x + size * Math.cos(angle),
      y: y + size * Math.sin(angle)
    });
  }
  return points;
} 