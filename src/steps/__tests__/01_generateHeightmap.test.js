import { generateHeightmap } from "../01_generateHeightmap.js";

describe("generateHeightmap", () => {
  const opts = { gridWidth: 10, gridHeight: 10, octaves: 3, persistence: 0.5, lacunarity: 2 };
  const seed = "unit‑test‑seed";

  it("should return correct array lengths", async () => {
    const { hexGrid, heightMap } = await generateHeightmap(seed, opts);
    expect(hexGrid).toHaveLength(opts.gridWidth * opts.gridHeight);
    expect(heightMap).toHaveLength(opts.gridWidth * opts.gridHeight);
  });

  it("should produce values in the expected range", async () => {
    const { heightMap } = await generateHeightmap(seed, opts);
    for (const v of heightMap) {
      expect(v).toBeGreaterThanOrEqual(-1e-6); // Allow for floating-point precision
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("should be deterministic for the same seed", async () => {
    const runA = await generateHeightmap(seed, opts);
    const runB = await generateHeightmap(seed, opts);
    expect(Array.from(runA.heightMap)).toEqual(Array.from(runB.heightMap));
  });

  it("should vary for different seeds", async () => {
    const runA = await generateHeightmap(seed, opts);
    const runB = await generateHeightmap(seed + "x", opts);
    expect(Array.from(runA.heightMap)).not.toEqual(Array.from(runB.heightMap));
  });
}); 