/**
 * Simplified Demo Stepper UI
 * 
 * A simple interface to test just the heightmap generation step.
 */

import generateHeightmap from '../steps/01_generateHeightmap.js';

class MapGeneratorStepper {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentStep = 0;
    this.mapData = {};
    this.steps = [
      { name: 'Generate Heightmap', fn: generateHeightmap }
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
        <h1>Fantasy World Map Generator - Simple Test</h1>
        
        <div class="controls">
          <button id="runStep">Run Heightmap Generation</button>
          <button id="reset">Reset</button>
        </div>
        
        <div class="step-info">
          <h2 id="stepTitle">Step 1: Generate Heightmap</h2>
          <p id="stepDescription">Generate terrain elevation data using noise algorithms</p>
        </div>
        
        <div class="preview">
          <h3>Preview</h3>
          <div id="previewArea" class="preview-area">
            <p>Click "Run Heightmap Generation" to see preview</p>
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
    `;
    document.head.appendChild(style);
  }

  updateStepDisplay() {
    const step = this.steps[this.currentStep];
    document.getElementById('stepTitle').textContent = `Step ${this.currentStep + 1}: ${step.name}`;
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

      // Run the heightmap generation
      const result = generateHeightmap('fantasy-world-seed', {
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
      
      // Restore console.log
      console.log = originalLog;
      
      // Display logs
      logs.forEach(log => this.log(log));
      
      // Store results
      this.mapData.hexGrid = result.hexGrid;
      this.mapData.heightmap = result.heightMap;
      
      this.log(`✓ ${step.name} completed successfully`);
      this.showPreview();
      
    } catch (error) {
      this.log(`✗ Error in ${step.name}: ${error.message}`);
      console.error(error);
    }
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
      previewArea.innerHTML = '<p>No data generated yet. Run heightmap generation to see preview.</p>';
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
    
    previewArea.innerHTML = preview;
  }

  renderHexGrid() {
    const hexGrid = this.mapData.hexGrid;
    const heightMap = this.mapData.heightmap;
    
    // Find grid bounds
    let minQ = Infinity, maxQ = -Infinity;
    let minR = Infinity, maxR = -Infinity;
    
    hexGrid.forEach(hex => {
      minQ = Math.min(minQ, hex.q);
      maxQ = Math.max(maxQ, hex.q);
      minR = Math.min(minR, hex.r);
      maxR = Math.max(maxR, hex.r);
    });
    
    const hexSize = 15; // Size for visualization
    
    // Use the same hexToPixel function as the heightmap generation
    function hexToPixel(hex, size) {
      const x = Math.sqrt(3) * size * (hex.q + hex.r / 2);
      const y = (3 / 2) * size * hex.r;
      return { x, y };
    }
    
    // Calculate bounds in pixel space
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    hexGrid.forEach(hex => {
      const pixel = hexToPixel(hex, hexSize);
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    });
    
    const width = maxX - minX + hexSize * 2;
    const height = maxY - minY + hexSize * 2;
    
    let svg = `
      <div style="margin-top: 20px;">
        <h4>Hex Grid Visualization (${hexGrid.length} cells)</h4>
        <svg width="${width}" height="${height}" style="border: 1px solid #ccc; background: #f0f0f0;">
    `;
    
    // Create a map for quick elevation lookup
    const elevationMap = new Map();
    hexGrid.forEach((hex, index) => {
      elevationMap.set(`${hex.q},${hex.r}`, heightMap[index]);
    });
    
    // Render each hex using the exact same coordinate system
    hexGrid.forEach(hex => {
      const elevation = elevationMap.get(`${hex.q},${hex.r}`);
      const color = this.getElevationColor(elevation);
      
      // Use the exact same hexToPixel function as the heightmap generation
      const pixel = hexToPixel(hex, hexSize);
      const x = pixel.x - minX + hexSize;
      const y = pixel.y - minY + hexSize;
      
      // Create hexagon path for pointy-topped orientation
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
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
          title="Hex (${hex.q},${hex.r}) - Elevation: ${elevation.toFixed(3)}"
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
    document.getElementById('runStep').addEventListener('click', () => this.runCurrentStep());
    document.getElementById('reset').addEventListener('click', () => this.reset());
  }
}

export default MapGeneratorStepper; 