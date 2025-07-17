/**
 * @typedef {{ col:number, row:number, q:number, r:number }} HexCell
 * @typedef {{ hexGrid: HexCell[], heightMap: Float32Array }} HeightmapData
 * @typedef {{
 *   seaLevel: number,
 *   hexSize: number,
 *   smoothingIterations?: number,
 *   simplifyTolerance?: number
 * }} CoastlineOptions
 */

import { hexToPixelFlatOffset } from "../utils/hexToPixel.js";
// Optional smoothing/simplify stubs:
// import { chaikin, simplify } from "../utils/geometry.js";

/**
 * Trace coastline by scanning each hex’s edges against its 6 neighbors.
 *
 * @param {HeightmapData} data
 * @param {CoastlineOptions} options
 * @returns {{
 *   landMask: Uint8Array,
 *   coastlinePath: string,
 *   cornerMask: Array<{q:number, r:number, x:number, y:number, isLand:number}>
 * }}
 */
export function maskCoastline({ hexGrid, heightMap }, options) {
  const {
    seaLevel,
    hexSize,
    smoothingIterations = 2,
    simplifyTolerance = 1.5
  } = options;

  // Try to infer grid width/height from hexGrid
  // Assumes rectangular grid, even-q offset
  const cols = Math.max(...hexGrid.map(h => h.col)) + 1;
  const rows = Math.max(...hexGrid.map(h => h.row)) + 1;
  const W = cols;
  const H = rows;

  // 1️⃣ build boolean landMask array
  const landMask = hexGrid.map((cell, idx) =>
    heightMap[idx] >= seaLevel ? 1 : 0
  );

  // map each cell’s axial coords to its index
  const coordToIndex = new Map(
    hexGrid.map((cell, idx) => [`${cell.q},${cell.r}`, idx])
  );

  // --- Build cornerMask: 6 corners per hex ---
  const cornerMask = [];
  hexGrid.forEach((hex, idx) => {
    const isLand = landMask[idx];
    const { x: cx, y: cy } = hexToPixelFlatOffset(hex, hexSize);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i); // Flat-topped: 0°, 60°, 120°, 180°, 240°, 300°
      cornerMask.push({
        q: hex.q,
        r: hex.r,
        x: cx + hexSize * Math.cos(angle),
        y: cy + hexSize * Math.sin(angle),
        isLand
      });
    }
  });

  // Debug assertions
  if (typeof window !== 'undefined') {
    if (landMask.length !== heightMap.length) {
      console.warn('landMask.length !== heightMap.length:', landMask.length, heightMap.length);
    }
    if (cornerMask.length !== heightMap.length * 6) {
      console.warn('cornerMask.length !== heightMap.length * 6:', cornerMask.length, heightMap.length * 6);
    }
  }

  // Helper: get index in hexGrid from (col,row)
  function getIndex(col, row) {
    if (col < 0 || col >= W || row < 0 || row >= H) return null;
    return col + row * W;
  }

  // 2️⃣ scan neighbors to collect all boundary segments
  const segments = [];
  const angles = [0, 60, 120, 180, 240, 300]; // flat-topped corner angles
  // Flat-topped neighbor directions (even-q offset)
  const dirs = [
    [+1,  0], [0, +1], [-1, +1],
    [-1,  0], [0, -1], [+1, -1]
  ];
  for (let i = 0; i < hexGrid.length; i++) {
    const cell = hexGrid[i];
    const { x: cx, y: cy } = hexToPixelFlatOffset(cell, hexSize);
    for (let edge = 0; edge < 6; edge++) {
      const [dq, dr] = dirs[edge];
      const key = `${cell.q + dq},${cell.r + dr}`;
      const nIdx = coordToIndex.get(key);
      // treat missing neighbor (map border) as water
      const neighborIsLand = nIdx != null && landMask[nIdx] === 1;
      // ONLY emit when this hex is land AND neighbor is water
      if (landMask[i] === 1 && !neighborIsLand) {
        const a1 = (Math.PI/180)*(angles[edge]);
        const a2 = (Math.PI/180)*(angles[(edge + 1)%6]);
        const p1 = { x: cx + hexSize * Math.cos(a1), y: cy + hexSize * Math.sin(a1) };
        const p2 = { x: cx + hexSize * Math.cos(a2), y: cy + hexSize * Math.sin(a2) };
        segments.push([p1, p2]);
      }
    }
  }

  // 3️⃣ merge segments into loops (robust)
  const loops = mergeSegmentsIntoLoops(segments);

  // 4️⃣ smooth & simplify each loop
  const finalLoops = loops.map(loop => {
    let pts = chaikin(loop, smoothingIterations);
    pts = simplify(pts, simplifyTolerance);
    return pts;
  });

  // 5️⃣ build SVG path string
  const coastlinePath = finalLoops
    .map(pts => {
      const d = pts.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(" ") + " Z";
      return d;
    })
    .join(" ");

  return {
    landMask: Uint8Array.from(landMask),
    coastlinePath,
    cornerMask
  };
}

// --- Helpers ---

/**
 * Merge boundary segments into closed loops using adjacency map.
 * @param {[{x:number,y:number},{x:number,y:number}][]} segments
 * @returns {Array<Array<{x:number,y:number}>>}
 */
function mergeSegmentsIntoLoops(segments) {
  // Index points as string keys (rounded for floating-point safety)
  function ptKey(p) {
    return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  }
  // Build adjacency map
  const neighbors = new Map();
  for (const [a, b] of segments) {
    const ka = ptKey(a), kb = ptKey(b);
    if (!neighbors.has(ka)) neighbors.set(ka, { pt: a, adj: new Set() });
    if (!neighbors.has(kb)) neighbors.set(kb, { pt: b, adj: new Set() });
    neighbors.get(ka).adj.add(kb);
    neighbors.get(kb).adj.add(ka);
  }
  // Track used edges
  const usedEdges = new Set();
  const loops = [];
  // Helper to mark edge as used
  function edgeKey(k1, k2) {
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
  }
  // Walk loops
  for (const [startKey, { pt: start }] of neighbors) {
    // Find an unused edge from this point
    for (const nextKey of neighbors.get(startKey).adj) {
      const ek = edgeKey(startKey, nextKey);
      if (usedEdges.has(ek)) continue;
      // Start a new loop
      const loop = [neighbors.get(startKey).pt];
      let prevKey = startKey;
      let currKey = nextKey;
      usedEdges.add(ek);
      while (currKey !== startKey) {
        loop.push(neighbors.get(currKey).pt);
        // Find next unused neighbor
        const currAdj = neighbors.get(currKey).adj;
        let found = false;
        for (const nKey of currAdj) {
          if (nKey === prevKey) continue;
          const eKey = edgeKey(currKey, nKey);
          if (!usedEdges.has(eKey)) {
            usedEdges.add(eKey);
            prevKey = currKey;
            currKey = nKey;
            found = true;
            break;
          }
        }
        if (!found) break; // Dead end (shouldn't happen for closed loops)
      }
      if (loop.length > 2) loops.push(loop);
    }
  }
  return loops;
}

/**
 * Chaikin’s corner-cutting smoothing.
 * @param {Array<{x:number,y:number}>} points
 * @param {number} iterations
 * @returns {Array<{x:number,y:number}>}
 */
function chaikin(points, iterations) {
  let pts = points;
  for (let k = 0; k < iterations; k++) {
    const next = [];
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i];
      const p1 = pts[(i+1) % pts.length];
      next.push({
        x: 0.75*p0.x + 0.25*p1.x,
        y: 0.75*p0.y + 0.25*p1.y
      });
      next.push({
        x: 0.25*p0.x + 0.75*p1.x,
        y: 0.25*p0.y + 0.75*p1.y
      });
    }
    pts = next;
  }
  return pts;
}

/**
 * Douglas–Peucker simplification stub
 * @param {Array<{x:number,y:number}>} points
 * @param {number} epsilon
 * @returns {Array<{x:number,y:number}>}
 */
function simplify(points, epsilon) {
  // TODO: Implement Ramer–Douglas–Peucker
  return points;
}

// TODO: Add Vitest tests to validate landMask and coastlinePath 