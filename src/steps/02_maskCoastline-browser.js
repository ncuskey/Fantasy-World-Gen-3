// Import hexToPixelFlatOffset for corner calculations
import { hexToPixelFlatOffset } from '../utils/hexToPixel.js';

/**
 * @typedef {{ col: number, row: number, q: number, r: number }} HexCell
 * @typedef {{ hexGrid: HexCell[], heightMap: Float32Array }} HeightmapData
 * @typedef {{
 *   seaLevel: number,
 *   hexSize: number,
 *   smoothingIterations: number,
 *   simplifyTolerance: number
 * }} CoastlineOptions
 * @typedef {{ x: number, y: number }} Point
 * @typedef {Point[]} CornerLoop
 */

/**
 * From a flat heightmap, produce:
 * - a landMask: Uint8Array (1=land, 0=sea),
 * - a corner-traced SVG path string for the coastline.
 *
 * @param {HeightmapData} data
 * @param {CoastlineOptions} options
 * @returns {{
 *   landMask: Uint8Array,
 *   coastlinePath: string
 * }}
 */
export function maskCoastline({ hexGrid, heightMap }, options) {
  const { seaLevel = 0.5, hexSize = 20, smoothingIterations = 2, simplifyTolerance = 0.1 } = options;
  
  // 1. Compute water mask
  const isWater = new Array(heightMap.length);
  for (let i = 0; i < heightMap.length; i++) {
    isWater[i] = heightMap[i] < seaLevel;
  }
  
  // 2. Gather corner points from water hexes
  const cornerList = gatherWaterHexCorners(hexGrid, isWater, hexSize);
  
  // 3. Filter out interior corners (shared by ≥3 water hexes)
  const perimeterCorners = filterInteriorCorners(cornerList);
  
  // Debug logging
  console.log("total water hexes:", isWater.filter(w => w).length);
  console.log("total raw corners:", cornerList.length);
  console.log("perimeter corners:", perimeterCorners.length);
  console.log("hexSize used:", hexSize);
  
  // 4. Cluster and sort into closed loops
  const cornerLoops = clusterAndSortCorners(perimeterCorners, hexSize);
  
  // 5. Build SVG path from corner loops
  const coastlinePath = cornerLoopsToSVGPath(cornerLoops);
  
  // 6. Create land mask (inverted from water mask)
  const landMask = new Uint8Array(heightMap.length);
  for (let i = 0; i < heightMap.length; i++) {
    landMask[i] = isWater[i] ? 0 : 1;
  }
  
  // 7. Build cornerMask for debug visualization (all hex corners with land/water info)
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
  
  return {
    landMask,
    coastlinePath,
    cornerMask,
    debugPerimeterPoints: perimeterCorners // For debugging visualization
  };
}

/**
 * Gather corner points from all water hexes
 * @param {HexCell[]} hexGrid
 * @param {boolean[]} isWater
 * @param {number} hexSize
 * @returns {Point[]}
 */
function gatherWaterHexCorners(hexGrid, isWater, hexSize) {
  const cornerList = [];
  
  for (let i = 0; i < hexGrid.length; i++) {
    if (!isWater[i]) continue; // Skip non-water hexes
    
    const hex = hexGrid[i];
    
    // Convert offset coords to pixel center
    const { x: cx, y: cy } = hexToPixelFlatOffset(hex, hexSize);
    
    // Compute six flat-topped corners at angles 0°, 60°, 120°, 180°, 240°, 300°
    const corners = Array.from({length: 6}, (_, j) => {
      const angle = (Math.PI / 180) * (60 * j);
      return { 
        x: cx + hexSize * Math.cos(angle),
        y: cy + hexSize * Math.sin(angle)
      };
    });
    
    // Add each corner (rounded to fixed precision)
    corners.forEach(corner => {
      cornerList.push({
        x: Math.round(corner.x * 100) / 100,
        y: Math.round(corner.y * 100) / 100
      });
    });
  }
  
  return cornerList;
}

/**
 * Filter out interior corners (shared by ≥3 water hexes)
 * @param {Point[]} cornerList
 * @returns {Point[]}
 */
function filterInteriorCorners(cornerList) {
  // Build a Map<string,count> keyed by "x,y"
  const cornerCounts = new Map();
  
  cornerList.forEach(corner => {
    const key = `${corner.x},${corner.y}`;
    cornerCounts.set(key, (cornerCounts.get(key) || 0) + 1);
  });
  
  // Keep only keys with count < 3 (perimeter corners)
  const perimeterCorners = [];
  cornerCounts.forEach((count, key) => {
    if (count < 3) {
      const [x, y] = key.split(',').map(Number);
      perimeterCorners.push({ x, y });
    }
  });
  
  return perimeterCorners;
}

/**
 * Cluster and sort perimeter corners into closed loops
 * @param {Point[]} perimeterCorners
 * @param {number} hexSize
 * @returns {CornerLoop[]}
 */
function clusterAndSortCorners(perimeterCorners, hexSize) {
  if (perimeterCorners.length === 0) return [];
  
  const sideLength = hexSize * Math.sqrt(3); // Distance between adjacent corners
  const connectionThreshold = sideLength * 1.15; // Tighter tolerance for better clustering
  
  const clusters = [];
  const used = new Set();
  
  // Find connected groups of points
  for (let i = 0; i < perimeterCorners.length; i++) {
    if (used.has(i)) continue;
    
    const cluster = [perimeterCorners[i]];
    used.add(i);
    
    // Find all points connected to this cluster
    let changed = true;
    while (changed) {
      changed = false;
      
      for (let j = 0; j < perimeterCorners.length; j++) {
        if (used.has(j)) continue;
        
        const point = perimeterCorners[j];
        
        // Check if this point connects to any point in the cluster
        for (const clusterPoint of cluster) {
          const distance = Math.sqrt(
            Math.pow(point.x - clusterPoint.x, 2) + 
            Math.pow(point.y - clusterPoint.y, 2)
          );
          
          if (distance <= connectionThreshold) {
            cluster.push(point);
            used.add(j);
            changed = true;
            break;
          }
        }
      }
    }
    
    if (cluster.length >= 3) { // Only keep clusters with at least 3 points
      clusters.push(cluster);
    }
  }
  
  // Sort each cluster into a closed loop
  return clusters.map(cluster => {
    // Compute centroid
    const cx = cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
    const cy = cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;
    
    // Sort points by angle from centroid
    return cluster.sort((a, b) => {
      const angleA = Math.atan2(a.y - cy, a.x - cx);
      const angleB = Math.atan2(b.y - cy, b.x - cx);
      return angleA - angleB;
    });
  });
}

/**
 * Convert corner loops to SVG path string
 * @param {CornerLoop[]} cornerLoops
 * @returns {string}
 */
function cornerLoopsToSVGPath(cornerLoops) {
  if (cornerLoops.length === 0) return "";
  
  const pathParts = cornerLoops.map(loop => {
    if (loop.length === 0) return "";
    
    const first = loop[0];
    let path = `M${first.x} ${first.y}`;
    
    for (let i = 1; i < loop.length; i++) {
      const point = loop[i];
      path += ` L${point.x} ${point.y}`;
    }
    
    // Close the loop
    path += " Z";
    
    return path;
  });
  
  return pathParts.join(" ");
}

// TODO: add Vitest tests verifying mask & path 