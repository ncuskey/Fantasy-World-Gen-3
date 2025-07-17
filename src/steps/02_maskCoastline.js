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
 * Trace all nested coastlines as rings, tagging orientation for correct fill.
 * @param {HeightmapData} param0
 * @param {CoastlineOptions} options
 * @returns {{
 *   landMask: Uint8Array,
 *   coastlinePaths: string[],
 *   rings: Array<HexCell[]>,
 *   ringsPixel: Array<Array<{x:number,y:number}>>,
 *   // For compatibility:
 *   coastlinePath: string, // first ring as SVG path
 *   cornerMask: Array<{q:number, r:number, x:number, y:number, isLand:number}>
 * }}
 */
export function maskCoastline({ hexGrid, heightMap }, options) {
  const { seaLevel, hexSize } = options;

  // 1. Attach isLand to each hex
  hexGrid.forEach((h, i) => h.isLand = heightMap[i] >= seaLevel);

  // 2. Build a neighbour lookup
  const hexMap = new Map(hexGrid.map(h => [`${h.q},${h.r}`, h]));

  // 3. Helper: 6 axial directions
  const DIRS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

  // 4. Build the dual-edge list: every edge between land and water
  const edges = [];
  hexGrid.forEach(h => {
    DIRS.forEach((dir,i) => {
      const nKey = `${h.q+dir[0]},${h.r+dir[1]}`;
      const n = hexMap.get(nKey);
      if (!n) return;                       // off-map
      if (h.isLand !== n.isLand) {          // coastline edge
        edges.push({ h, n, edgeIndex: i }); // store once
      }
    });
  });

  // 5. Walk each ring until all edges are consumed
  const rings = [];
  const used = new Set();

  function key(a,b,index) {   // unique edge key
    const [q1,r1] = [a.q,a.r], [q2,r2] = [b.q,b.r];
    return q1 < q2 || (q1 === q2 && r1 < r2)
         ? `${q1},${r1}-${q2},${r2}-${index}`
         : `${q2},${r2}-${q1},${r1}-${index}`;
  }

  while (edges.length) {
    const ring = [];
    let { h, n, edgeIndex } = edges.pop();
    const startKey = key(h,n,edgeIndex);

    let current = h;
    let dir = edgeIndex;

    do {
      const edgeK = key(current, n, dir);
      if (used.has(edgeK)) break;
      used.add(edgeK);

      ring.push(current);

      // step to next hex around the coastline
      const nextDir = (dir + (current.isLand ? 1 : 5)) % 6; // keep land on the left
      const [dq,dr] = DIRS[nextDir];
      const nextHex = hexMap.get(`${current.q+dq},${current.r+dr}`);
      if (!nextHex) break;

      // find the edge between nextHex and current
      const oppDir = (nextDir + 3) % 6;
      const edgeKey = key(nextHex, current, oppDir);
      used.add(edgeKey);

      current = nextHex;
      dir = oppDir;
    } while (!used.has(startKey));

    if (ring.length > 2) rings.push(ring);
  }

  // Helper: signed area for orientation (positive = clockwise)
  function signedArea(ring) {
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      area += (a.q * b.r - b.q * a.r);
    }
    return area / 2;
  }

  // After rings are built
  rings.forEach(r => {
    r.clockwise = signedArea(r) > 0;   // true = land ring
    r.area = Math.abs(signedArea(r));
  });
  rings.sort((a, b) => b.area - a.area);   // draw big → small
  const filteredRings = rings.filter(r => r.area > 0.5);  // drop < half-tile

  // Convert filtered rings of hexes to pixel points for rendering
  const ringsPixel = filteredRings.map(ring => {
    const pts = ring.map(hex => {
      const { x, y } = hexToPixelFlatOffset(hex, hexSize);
      return { x, y };
    });
    pts.clockwise = ring.clockwise;
    pts.area = ring.area;
    return pts;
  });

  // Build SVG path strings for each ring
  const coastlinePaths = ringsPixel.map(pts =>
    pts.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ') + ' Z'
  );

  // For compatibility: build a single path string for the first ring
  const coastlinePath = coastlinePaths[0] || '';

  // Build cornerMask for debug visualization (all hex corners with land/water info)
  const cornerMask = [];
  hexGrid.forEach((hex, idx) => {
    const isLand = hex.isLand;
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

  return {
    landMask: Uint8Array.from(hexGrid.map(h => h.isLand ? 1 : 0)),
    coastlinePaths, // array of SVG path strings, one per ring
    rings: filteredRings,          // array of hex arrays (with orientation)
    ringsPixel,     // array of pixel point arrays
    coastlinePath,  // for compatibility: first ring as SVG path
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