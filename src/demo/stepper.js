/**
 * Demo Stepper UI
 * 
 * A simple interface to run each map generation step in sequence
 * and preview the results.
 */

import generateHeightmap from '../steps/01_generateHeightmap-browser.js';
import { hexToPixelFlatOffset, getFlatHexPoints, getGridBoundsFlat } from '../utils/hexToPixel.js';
import { maskCoastline } from '../steps/02_maskCoastline-browser.js';
import simulateRivers from '../steps/03_simulateRivers.js';
import placeBiomes from '../steps/04_placeBiomes.js';
import placeSettlements from '../steps/05_placeSettlements.js';
import generateRoads from '../steps/06_generateRoads.js';
import generateLabels from '../steps/07_generateLabels.js';
import renderMap from '../steps/08_renderMap.js';

class MapGeneratorStepper {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentStep = 0;
    this.mapData = {};
    this.steps = [
      { name: 'Generate Heightmap', fn: generateHeightmap },
      { name: 'Mask Coastline', fn: maskCoastline },
      { name: 'Simulate Rivers', fn: simulateRivers },
      { name: 'Place Biomes', fn: placeBiomes },
      { name: 'Place Settlements', fn: placeSettlements },
      { name: 'Generate Roads', fn: generateRoads },
      { name: 'Generate Labels', fn: generateLabels },
      { name: 'Render Map', fn: renderMap }
    ];
    
    this.init();
  }

  init() {
    this.createUI();
    this.updateStepDisplay();
    this.addEventListeners();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="stepper-container">
        <h1>Fantasy World Map Generator</h1>
        
        <div class="controls">
          <button id="prevStep">Previous</button>
          <button id="nextStep">Next</button>
          <button id="runAll">Run All</button>
          <button id="reset">Reset</button>
        </div>
        
        <div class="step-info">
          <h2 id="stepTitle">Step 1: Generate Heightmap</h2>
          <p id="stepDescription">Current step description</p>
        </div>
        
        <div class="preview">
          <h3>Preview</h3>
          <div id="previewArea" class="preview-area">
            <p>Run a step to see preview</p>
          </div>
        </div>
        
        <div class="options">
          <h3>Options</h3>
          <div id="optionsArea">
            <p>Step-specific options will appear here</p>
          </div>
        </div>
        
        <div class="log">
          <h3>Console Log</h3>
          <div id="logArea" class="log-area"></div>
        </div>
      </div>
    `;

    // Add some basic styling
    this.addStyles();
    
    // Add event listeners
    this.addEventListeners();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .stepper-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
      }
      
      .controls {
        margin: 20px 0;
        display: flex;
        gap: 10px;
      }
      
      .controls button {
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
      }
      
      .controls button:hover {
        background: #0056b3;
      }
      
      .controls button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      
      .step-info {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 5px;
        margin: 20px 0;
      }
      
      .preview-area {
        background: #fff;
        border: 1px solid #ddd;
        padding: 20px;
        min-height: 200px;
        border-radius: 5px;
      }
      
      .log-area {
        background: #000;
        color: #0f0;
        padding: 15px;
        font-family: monospace;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
        border-radius: 5px;
      }
      
      .options {
        margin: 20px 0;
      }
    `;
    document.head.appendChild(style);
  }

  updateStepDisplay() {
    const step = this.steps[this.currentStep];
    document.getElementById('stepTitle').textContent = `Step ${this.currentStep + 1}: ${step.name}`;
    
    // Update button states
    document.getElementById('prevStep').disabled = this.currentStep === 0;
    document.getElementById('nextStep').disabled = this.currentStep === this.steps.length - 1;
  }

  async nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      await this.runCurrentStep();
      this.currentStep++;
      this.updateStepDisplay();
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateStepDisplay();
      this.showPreview();
    }
  }

  async runCurrentStep() {
    const step = this.steps[this.currentStep];
    this.log(`Running: ${step.name}`);
    
    try {
      // Capture console.log output
      const originalLog = console.log;
      const logs = [];
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog.apply(console, args);
      };

      // Run the step with appropriate parameters
      await this.executeStep(this.currentStep);
      
      // Restore console.log
      console.log = originalLog;
      
      // Display logs
      logs.forEach(log => this.log(log));
      
      this.log(`✓ ${step.name} completed successfully`);
      this.showPreview();
      
    } catch (error) {
      this.log(`✗ Error in ${step.name}: ${error.message}`);
    }
  }

  async executeStep(stepIndex) {
    const width = 256;
    const height = 256;
    
    switch (stepIndex) {
      case 0: // Generate Heightmap
        const heightmapResult = await generateHeightmap('fantasy-world-seed', {
          gridWidth: 32,
          gridHeight: 32,
          octaves: 6,
          persistence: 0.5,
          lacunarity: 2.0,
          frequency: 1.0,
          amplitude: 1.0,
          gradientFalloff: 'circular',
          falloffCurve: 'linear',
          seaLevel: 0.3
        });
        this.mapData.hexGrid = heightmapResult.hexGrid;
        this.mapData.heightmap = heightmapResult.heightMap;
        // Debug hook: expose heightmap
        if (typeof window !== 'undefined') {
          window.__heightmap = this.mapData.heightmap;
        }
        break;
        
      case 1: // Mask Coastline
        const seaLevel = 0.3;
        const coastlineResult = maskCoastline({
          hexGrid: this.mapData.hexGrid,
          heightMap: this.mapData.heightmap
        }, {
          seaLevel,
          hexSize: 15, // Match the hexSize used in renderHexGrid
          smoothingIterations: 2,
          simplifyTolerance: 0.1
        });
        this.mapData.landMask = coastlineResult.landMask;
        this.mapData.coastlinePath = coastlineResult.coastlinePath;
        this.mapData.cornerMask = coastlineResult.cornerMask; // Store cornerMask
        this.mapData.ringsPixel = coastlineResult.ringsPixel;
        this.mapData.seaLevel = seaLevel;
        // Debug hook: expose land mask
        if (typeof window !== 'undefined') {
          window.__coastlineMask = this.mapData.landMask;
          // Log lengths
          console.log('heightmap length:', this.mapData.heightmap?.length);
          console.log('mask length:', this.mapData.landMask?.length);
          // Alignment check (if both present and same length)
          const hm = this.mapData.heightmap;
          const mask = this.mapData.landMask;
          const seaLevel = 0.3; // Must match the value passed to maskCoastline
          if (hm && mask && hm.length === mask.length) {
            let mismatches = 0;
            for (let i = 0; i < hm.length; i++) {
              // Use the same threshold as maskCoastline
              const isLand = hm[i] >= seaLevel ? 1 : 0;
              if (mask[i] !== isLand) {
                if (mismatches < 10) {
                  console.warn(`Mismatch at idx ${i}: height=${hm[i]}, mask=${mask[i]}`);
                }
                mismatches++;
              }
            }
            if (mismatches === 0) {
              console.log('Mask and heightmap are aligned.');
            } else {
              console.warn(`Total mismatches: ${mismatches}`);
            }
          }
        }
        break;
        
      case 2: // Simulate Rivers
        const riverResult = simulateRivers(this.mapData.heightmap);
        this.mapData.riverMap = riverResult.riverMap;
        this.mapData.rivers = riverResult.rivers;
        break;
        
      case 3: // Place Biomes
        const biomeResult = placeBiomes(this.mapData.heightmap, this.mapData.riverMap);
        this.mapData.biomeMap = biomeResult.biomeMap;
        this.mapData.biomes = biomeResult.biomes;
        break;
        
      case 4: // Place Settlements
        this.mapData.settlements = placeSettlements(
          this.mapData.heightmap, 
          this.mapData.biomeMap, 
          this.mapData.riverMap
        );
        break;
        
      case 5: // Generate Roads
        const roadResult = generateRoads(this.mapData.heightmap, this.mapData.settlements);
        this.mapData.roadMap = roadResult.roadMap;
        this.mapData.roads = roadResult.roads;
        break;
        
      case 6: // Generate Labels
        this.mapData.labels = generateLabels(
          this.mapData.settlements, 
          this.mapData.rivers, 
          this.mapData.biomes
        );
        break;
        
      case 7: // Render Map
        this.mapData.renderedMap = renderMap(this.mapData);
        break;
    }
  }

  async runAllSteps() {
    this.log('Starting complete map generation...');
    
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i;
      this.updateStepDisplay();
      await this.runCurrentStep();
      
      // Small delay between steps for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.log('✓ Complete map generation finished!');
  }

  reset() {
    this.currentStep = 0;
    this.mapData = {};
    this.updateStepDisplay();
    this.clearLog();
    this.showPreview();
  }

  showPreview() {
    const previewArea = document.getElementById('previewArea');
    
    if (Object.keys(this.mapData).length === 0) {
      previewArea.innerHTML = '<p>No data generated yet. Run a step to see preview.</p>';
      return;
    }

    let preview = '<h4>Generated Data:</h4><ul>';
    
    Object.keys(this.mapData).forEach(key => {
      const value = this.mapData[key];
      if (Array.isArray(value)) {
        preview += `<li>${key}: Array(${value.length})</li>`;
      } else if (typeof value === 'object' && value !== null) {
        preview += `<li>${key}: Object with ${Object.keys(value).length} properties</li>`;
      } else {
        preview += `<li>${key}: ${value}</li>`;
      }
    });
    
    preview += '</ul>';

    // Add hex grid visualization if we have heightmap data
    if (this.mapData.hexGrid && this.mapData.heightmap) {
      preview += this.renderHexGrid();
    }
    
    // Add coastline visualization if we have coastline data
    if (this.mapData.coastlinePath) {
      preview += this.renderCoastline();
    }
    
    // Add land mask debug visualization if we have land mask data
    if (this.mapData.landMask) {
      preview += this.renderLandMaskDebug();
    }
    
    previewArea.innerHTML = preview;
  }

  renderHexGrid() {
    const hexGrid = this.mapData.hexGrid;
    const heightMap = this.mapData.heightmap;
    const landMask = this.mapData.landMask;
    
    // Find grid bounds using offset coordinates
    let minCol = Infinity, maxCol = -Infinity;
    let minRow = Infinity, maxRow = -Infinity;
    
    hexGrid.forEach(hex => {
      minCol = Math.min(minCol, hex.col);
      maxCol = Math.max(maxCol, hex.col);
      minRow = Math.min(minRow, hex.row);
      maxRow = Math.max(maxRow, hex.row);
    });
    
    const hexSize = 15; // Size for visualization
    const gridWidth = maxCol - minCol + 1;
    const gridHeight = maxRow - minRow + 1;
    
    // Calculate bounds in pixel space using offset coordinates
    const { minX, maxX, minY, maxY } = getGridBoundsFlat(gridWidth, gridHeight, hexSize);
    const width = maxX - minX + hexSize * 2;
    const height = maxY - minY + hexSize * 2;
    
    let svg = `
      <div style="margin-top: 20px;">
        <h4>Hex Grid Visualization (${hexGrid.length} cells)</h4>
        <svg width="${width}" height="${height}" style="border: 1px solid #ccc; background: #f0f0f0;">
    `;
    
    // Render each hex using offset coordinates
    hexGrid.forEach((hex, index) => {
      let color;
      if (landMask) {
        const isLand = landMask[index] === 1;
        color = isLand ? "#000" : "#fff";
      } else {
        const elevation = heightMap[index];
        color = this.getElevationColor(elevation);
      }
      // Use offset coordinates for pixel conversion
      const pixel = hexToPixelFlatOffset({ col: hex.col, row: hex.row }, hexSize);
      const x = pixel.x - minX + hexSize;
      const y = pixel.y - minY + hexSize;
      // Create hexagon path for flat-topped orientation
      const points = [];
      for (let i = 0; i < 6; i++) {
        // start at angle = 0° (flat side at top), then every 60°
        const angle = (Math.PI / 180) * (60 * i);
        const px = x + hexSize * Math.cos(angle);
        const py = y + hexSize * Math.sin(angle);
        points.push(`${px},${py}`);
      }
      svg += `
        <polygon 
          points="${points.join(' ')}" 
          fill="${color}" 
          stroke="#333" 
          stroke-width="1"
          title="Hex (${hex.col},${hex.row})"
        />
      `;
    });
    
    svg += '</svg></div>';
    return svg;
  }

  getElevationColor(elevation) {
    // Color gradient from deep blue (water) to green (land) to white (mountains)
    if (elevation < 0.3) {
      // Water - blue gradient
      const intensity = Math.floor(100 + (elevation / 0.3) * 155);
      return `rgb(0, 0, ${intensity})`;
    } else if (elevation < 0.6) {
      // Land - green gradient
      const intensity = Math.floor(100 + ((elevation - 0.3) / 0.3) * 155);
      return `rgb(0, ${intensity}, 0)`;
    } else {
      // Mountains - white/gray gradient
      const intensity = Math.floor(100 + ((elevation - 0.6) / 0.4) * 155);
      return `rgb(${intensity}, ${intensity}, ${intensity})`;
    }
  }

  renderCoastline() {
    if (!this.mapData.coastlinePaths && !this.mapData.ringsPixel) return '';
    
    // Use the same bounds as the hex grid for consistency
    const hexGrid = this.mapData.hexGrid;
    let minCol = Infinity, maxCol = -Infinity;
    let minRow = Infinity, maxRow = -Infinity;
    
    hexGrid.forEach(hex => {
      minCol = Math.min(minCol, hex.col);
      maxCol = Math.max(maxCol, hex.col);
      minRow = Math.min(minRow, hex.row);
      maxRow = Math.max(maxRow, hex.row);
    });
    
    const hexSize = 15;
    const gridWidth = maxCol - minCol + 1;
    const gridHeight = maxRow - minRow + 1;
    
    const { minX, maxX, minY, maxY } = getGridBoundsFlat(gridWidth, gridHeight, hexSize);
    const width = maxX - minX + hexSize * 2;
    const height = maxY - minY + hexSize * 2;
    
    // Render all coastline rings with correct fill/stroke
    let ringsSvg = '';
    if (this.mapData.ringsPixel) {
      this.mapData.ringsPixel.forEach((pts, i) => {
        const isLand = pts.clockwise;
        const fill = isLand ? 'limegreen' : 'dodgerblue';
        const stroke = isLand ? '#222' : 'none';
        const strokeWidth = isLand ? 1 : 0;
        const path = pts.map((p, j) => {
          const x = p.x - minX + hexSize;
          const y = p.y - minY + hexSize;
          return `${j === 0 ? 'M' : 'L'}${x},${y}`;
        }).join(' ') + ' Z';
        ringsSvg += `<path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="0.7" />`;
      });
    } else if (this.mapData.coastlinePath) {
      // fallback: single path
      const transformPath = (pathString) => {
        return pathString.replace(/([ML])([\-\d.]+)\s+([\-\d.]+)/g, (match, command, x, y) => {
          const pixelX = parseFloat(x);
          const pixelY = parseFloat(y);
          const transformedX = pixelX - minX + hexSize;
          const transformedY = pixelY - minY + hexSize;
          return `${command}${transformedX} ${transformedY}`;
        });
      };
      const transformedPath = transformPath(this.mapData.coastlinePath);
      ringsSvg += `<path d="${transformedPath}" stroke="#000" stroke-width="2" fill="none" />`;
    }
    
    // Overlay color-coded cornerMask points
    let cornerPoints = '';
    if (this.mapData.cornerMask) {
      this.mapData.cornerMask.forEach(corner => {
        const transformedX = corner.x - minX + hexSize;
        const transformedY = corner.y - minY + hexSize;
        const color = corner.isLand ? 'limegreen' : 'dodgerblue';
        cornerPoints += `<circle cx="${transformedX}" cy="${transformedY}" r="2" fill="${color}" stroke="#222" stroke-width="0.5" />`;
      });
    }
    
    return `
      <div style="margin-top: 20px;">
        <h4>Coastline Visualization</h4>
        <svg width="${width}" height="${height}" style="border: 1px solid #ccc; background: #f0f0f0;">
          ${ringsSvg}
          ${cornerPoints}
        </svg>
        <p><strong>Land Mask:</strong> ${this.mapData.landMask ? `${this.mapData.landMask.filter(x => x === 1).length} land cells, ${this.mapData.landMask.filter(x => x === 0).length} sea cells` : 'Not available'}</p>
        ${this.mapData.cornerMask ? `<p><strong>Debug:</strong> ${this.mapData.cornerMask.length} corners shown (green=land, blue=water)</p>` : ''}
      </div>
    `;
  }

  renderLandMaskDebug() {
    if (!this.mapData.landMask || !this.mapData.hexGrid || !this.mapData.heightmap) return '';
    
    const hexGrid = this.mapData.hexGrid;
    const heightMap = this.mapData.heightmap;
    const landMask = this.mapData.landMask;
    const seaLevel = this.mapData.seaLevel ?? 0.3;
    
    // Find grid bounds
    let minCol = Infinity, maxCol = -Infinity;
    let minRow = Infinity, maxRow = -Infinity;
    
    hexGrid.forEach(hex => {
      minCol = Math.min(minCol, hex.col);
      maxCol = Math.max(maxCol, hex.col);
      minRow = Math.min(minRow, hex.row);
      maxRow = Math.max(maxRow, hex.row);
    });
    
    const hexSize = 15;
    const gridWidth = maxCol - minCol + 1;
    const gridHeight = maxRow - minRow + 1;
    
    const { minX, maxX, minY, maxY } = getGridBoundsFlat(gridWidth, gridHeight, hexSize);
    const width = maxX - minX + hexSize * 2;
    const height = maxY - minY + hexSize * 2;
    
    let svg = `
      <div style="margin-top: 20px;">
        <h4>Land Mask Debug (Black=Land, White=Sea, Green/Blue=CornerMask)</h4>
        <svg width="${width}" height="${height}" style="border: 1px solid #ccc; background: #f0f0f0;">
    `;
    
    // Render each hex as black (land) or white (sea)
    hexGrid.forEach((hex, index) => {
      const isLand = landMask[index] === 1;
      const color = isLand ? "#000" : "#fff";
      
      // Use offset coordinates for pixel conversion
      const pixel = hexToPixelFlatOffset({ col: hex.col, row: hex.row }, hexSize);
      const x = pixel.x - minX + hexSize;
      const y = pixel.y - minY + hexSize;
      
      // Create hexagon path for flat-topped orientation
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        const px = x + hexSize * Math.cos(angle);
        const py = y + hexSize * Math.sin(angle);
        points.push(`${px},${py}`);
      }
      
      svg += `
        <polygon 
          points="${points.join(' ')}" 
          fill="${color}" 
          stroke="#333" 
          stroke-width="1"
          title="Hex (${hex.col},${hex.row}) - Elevation: ${heightMap[index].toFixed(3)} - Land: ${isLand}"
        />
      `;
    });
    
    // Overlay color-coded cornerMask points
    if (this.mapData.cornerMask) {
      this.mapData.cornerMask.forEach(corner => {
        const transformedX = corner.x - minX + hexSize;
        const transformedY = corner.y - minY + hexSize;
        const color = corner.isLand ? 'limegreen' : 'dodgerblue';
        svg += `<circle cx="${transformedX}" cy="${transformedY}" r="2" fill="${color}" stroke="#222" stroke-width="0.5" />`;
      });
    }
    
    svg += '</svg>';
    svg += `<p><strong>Land Mask Verification:</strong> ${landMask.filter(x => x === 1).length} land cells, ${landMask.filter(x => x === 0).length} sea cells</p>`;
    svg += `<p><strong>Sea Level:</strong> ${seaLevel}</p>`;
    svg += this.mapData.cornerMask ? `<p><strong>Debug:</strong> ${this.mapData.cornerMask.length} corners shown (green=land, blue=water)</p>` : '';
    svg += '</div>';
    
    return svg;
  }

  log(message) {
    const logArea = document.getElementById('logArea');
    const timestamp = new Date().toLocaleTimeString();
    logArea.innerHTML += `[${timestamp}] ${message}\n`;
    logArea.scrollTop = logArea.scrollHeight;
  }

  clearLog() {
    document.getElementById('logArea').innerHTML = '';
  }

  addEventListeners() {
    document.getElementById('prevStep').addEventListener('click', () => this.previousStep());
    document.getElementById('nextStep').addEventListener('click', () => this.nextStep());
    document.getElementById('runAll').addEventListener('click', () => this.runAllSteps());
    document.getElementById('reset').addEventListener('click', () => this.reset());
  }
}

// Export for use
export default MapGeneratorStepper;

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
  window.MapGeneratorStepper = MapGeneratorStepper;
} 