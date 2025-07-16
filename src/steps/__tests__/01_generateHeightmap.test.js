import { generateHeightmap } from "../01_generateHeightmap.js";

describe("generateHeightmap", () => {
  const opts = { gridWidth: 10, gridHeight: 10, octaves: 3, persistence: 0.5, lacunarity: 2 };
  const seed = "unit‑test‑seed";

  it("should return correct array lengths", () => {
    const { hexGrid, heightMap } = generateHeightmap(seed, opts);
    expect(hexGrid).toHaveLength(opts.gridWidth * opts.gridHeight);
    expect(heightMap).toHaveLength(opts.gridWidth * opts.gridHeight);
  });

  it("should produce values in the expected range", () => {
    const { heightMap } = generateHeightmap(seed, opts);
    for (const v of heightMap) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("should be deterministic for the same seed", () => {
    const runA = generateHeightmap(seed, opts).heightMap;
    const runB = generateHeightmap(seed, opts).heightMap;
    expect(Array.from(runA)).toEqual(Array.from(runB));
  });

  it("should vary for different seeds", () => {
    const runA = generateHeightmap(seed, opts).heightMap;
    const runB = generateHeightmap(seed + "x", opts).heightMap;
    expect(Array.from(runA)).not.toEqual(Array.from(runB));
  });
}); 