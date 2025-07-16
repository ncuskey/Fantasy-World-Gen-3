# Fantasy World Map Generator

A procedural fantasy world map generator that creates realistic terrain, rivers, biomes, settlements, and road networks through a step-by-step generation pipeline.

## 🚀 Current Status

**Step 1: Heightmap Generation** ✅ **COMPLETED**
- Hex grid-based terrain generation using Simplex noise
- Multi-octave noise with configurable parameters
- Radial gradient falloff for island effects
- Deterministic output with seed-based generation
- Performance optimized with Float32Array

**Steps 2-8: In Development**
- Coastline masking and erosion
- River simulation and flow patterns
- Biome placement and climate zones
- Settlement placement and city generation
- Road network generation
- Label and name generation
- Final map rendering

## Project Structure

```
src/
├─ steps/
│  ├─ 01_generateHeightmap.js    ✅ Creates base terrain using noise algorithms
│  ├─ 02_maskCoastline.js        🔄 Identifies and processes land/water boundaries
│  ├─ 03_simulateRivers.js       🔄 Generates river systems from high to low elevation
│  ├─ 04_placeBiomes.js          🔄 Assigns biomes based on elevation and moisture
│  ├─ 05_placeSettlements.js     🔄 Places cities, towns, and villages
│  ├─ 06_generateRoads.js        🔄 Creates road networks connecting settlements
│  ├─ 07_generateLabels.js       🔄 Generates names for features and settlements
│  └─ 08_renderMap.js            🔄 Combines all layers into final visual map
└─ demo/
   └─ stepper.js                 ✅ Interactive UI to run and preview each step
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Fantasy-World-Gen-3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the demo**
   ```bash
   # Start a local server
   npm run dev
   
   # Or use Python's built-in server
   python3 -m http.server 8000
   ```

4. **Open in browser**
   - Navigate to `http://localhost:8000/demo.html`
   - Use the stepper interface to run each generation step
   - Watch the map evolve from basic heightmap to complete fantasy world

## Generation Pipeline

The map generation follows an 8-step process:

1. **Heightmap Generation** ✅ - Creates realistic terrain using Simplex noise on hex grid
2. **Coastline Masking** 🔄 - Defines land/water boundaries with erosion effects
3. **River Simulation** 🔄 - Generates river systems following terrain contours
4. **Biome Placement** 🔄 - Assigns biomes based on elevation, moisture, and temperature
5. **Settlement Placement** 🔄 - Places cities, towns, and villages in suitable locations
6. **Road Generation** 🔄 - Creates road networks connecting settlements
7. **Label Generation** 🔄 - Names geographic features and settlements
8. **Map Rendering** 🔄 - Combines all layers into the final visual map

## Features

- **Modular Design**: Each step is independent and can be customized
- **Interactive Preview**: See results at each step of the generation process
- **Configurable Parameters**: Adjust generation options for different map styles
- **Realistic Algorithms**: Uses established procedural generation techniques
- **Hex Grid System**: Efficient hex-based coordinate system for natural terrain
- **Deterministic Output**: Same seed always produces identical results
- **Performance Optimized**: Uses typed arrays and efficient algorithms
- **Extensible**: Easy to add new features or modify existing ones

## Development

Each step module exports a main function that takes appropriate input data and options, returning the processed data for the next step. The stepper UI manages the flow between steps and provides visual feedback.

### Adding New Steps

1. Create a new file in `src/steps/` following the naming convention
2. Export a function that takes the required input data and options
3. Add the step to the `steps` array in `src/demo/stepper.js`
4. Update the `executeStep` method to handle the new step

### Customizing Generation

Each step accepts an `options` parameter that allows customization of the generation process. See individual step files for available options.

### Testing

The project includes comprehensive test infrastructure:
- Deterministic output verification
- Hex grid structure validation
- Parameter variation testing
- Integration testing with the stepper UI

## Dependencies

- **simplex-noise**: High-quality noise generation for realistic terrain
- **seedrandom**: Deterministic random number generation for reproducible results

## Documentation

- [DEVLOG.md](./DEVLOG.md) - Development progress and technical decisions
- [HEIGHTMAP_UPGRADE.md](./HEIGHTMAP_UPGRADE.md) - Detailed upgrade from Gen 2 to Gen 3

## License

MIT License - see LICENSE file for details.