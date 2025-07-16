import { describe, it, expect } from 'vitest';
import { maskCoastline } from './02_maskCoastline.js';

describe('Coastline Masking', () => {
  it('should generate land mask and coastline path from heightmap using corner tracing', () => {
    // Create a simple test hex grid and heightmap
    const hexGrid = [
      { col: 0, row: 0, q: 0, r: 0 },
      { col: 1, row: 0, q: 1, r: 0 },
      { col: 0, row: 1, q: 0, r: 1 },
      { col: 1, row: 1, q: 1, r: 1 }
    ];
    
    const heightMap = new Float32Array([0.2, 0.8, 0.3, 0.9]); // Some land, some sea
    
    const options = {
      seaLevel: 0.5,
      smoothingIterations: 1,
      simplifyTolerance: 0.1
    };
    
    const result = maskCoastline({ hexGrid, heightMap }, options);
    
    // Check that we get the expected output structure
    expect(result).toHaveProperty('landMask');
    expect(result).toHaveProperty('coastlinePath');
    
    // Check land mask
    expect(result.landMask).toBeInstanceOf(Uint8Array);
    expect(result.landMask.length).toBe(heightMap.length);
    
    // Check that land mask correctly identifies land vs sea
    expect(result.landMask[0]).toBe(0); // 0.2 < 0.5, so sea
    expect(result.landMask[1]).toBe(1); // 0.8 > 0.5, so land
    expect(result.landMask[2]).toBe(0); // 0.3 < 0.5, so sea
    expect(result.landMask[3]).toBe(1); // 0.9 > 0.5, so land
    
    // Check coastline path (should be corner-traced)
    expect(typeof result.coastlinePath).toBe('string');
    // Corner tracing should produce closed loops with "Z" commands
    expect(result.coastlinePath).toContain('Z');
  });
  
  it('should handle empty grid', () => {
    const hexGrid = [];
    const heightMap = new Float32Array(0);
    
    const options = {
      seaLevel: 0.5,
      smoothingIterations: 1,
      simplifyTolerance: 0.1
    };
    
    const result = maskCoastline({ hexGrid, heightMap }, options);
    
    expect(result.landMask).toBeInstanceOf(Uint8Array);
    expect(result.landMask.length).toBe(0);
    expect(result.coastlinePath).toBe('');
  });
  
  it('should handle all land', () => {
    const hexGrid = [
      { col: 0, row: 0, q: 0, r: 0 },
      { col: 1, row: 0, q: 1, r: 0 }
    ];
    
    const heightMap = new Float32Array([0.8, 0.9]); // All above sea level
    
    const options = {
      seaLevel: 0.5,
      smoothingIterations: 1,
      simplifyTolerance: 0.1
    };
    
    const result = maskCoastline({ hexGrid, heightMap }, options);
    
    expect(result.landMask[0]).toBe(1);
    expect(result.landMask[1]).toBe(1);
  });
  
  it('should handle all sea', () => {
    const hexGrid = [
      { col: 0, row: 0, q: 0, r: 0 },
      { col: 1, row: 0, q: 1, r: 0 }
    ];
    
    const heightMap = new Float32Array([0.1, 0.2]); // All below sea level
    
    const options = {
      seaLevel: 0.5,
      smoothingIterations: 1,
      simplifyTolerance: 0.1
    };
    
    const result = maskCoastline({ hexGrid, heightMap }, options);
    
    expect(result.landMask[0]).toBe(0);
    expect(result.landMask[1]).toBe(0);
  });
  
  it('should respect custom sea level', () => {
    const hexGrid = [
      { col: 0, row: 0, q: 0, r: 0 },
      { col: 1, row: 0, q: 1, r: 0 }
    ];
    
    const heightMap = new Float32Array([0.3, 0.7]);
    
    // Test with different sea levels
    const result1 = maskCoastline({ hexGrid, heightMap }, { seaLevel: 0.2 });
    const result2 = maskCoastline({ hexGrid, heightMap }, { seaLevel: 0.5 });
    
    // With sea level 0.2: both should be land
    expect(result1.landMask[0]).toBe(1);
    expect(result1.landMask[1]).toBe(1);
    
    // With sea level 0.5: first should be sea, second should be land
    expect(result2.landMask[0]).toBe(0);
    expect(result2.landMask[1]).toBe(1);
  });
}); 