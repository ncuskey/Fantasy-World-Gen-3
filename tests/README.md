# Tests

This directory contains test files for the Fantasy World Generator.

## Structure

```
tests/
├── browser/              # Browser-based test pages
│   ├── test-coastline-fix.html      # Coastline coordinate validation
│   ├── test-coastline-debug.html    # Coastline debugging
│   ├── test-rectangular.html        # Rectangular grid testing
│   ├── test-flat-top.html           # Flat-top hex testing
│   ├── test-simple.html             # Simple testing
│   └── test-demo.html               # Demo testing
└── README.md            # This file
```

## Browser Tests

The `browser/` directory contains HTML test pages that can be opened directly in a web browser to validate specific functionality:

- **test-coastline-fix.html**: Tests the coastline coordinate transformation fix
- **test-coastline-debug.html**: Debug visualization for coastline extraction
- **test-rectangular.html**: Validates the rectangular hex grid layout
- **test-flat-top.html**: Tests flat-topped hex orientation
- **test-simple.html**: Simple functionality tests
- **test-demo.html**: Demo functionality tests

### Running Browser Tests

1. Start a local server:
   ```bash
   python3 -m http.server 8000
   # or
   npm run dev
   ```

2. Open the test page in your browser:
   ```
   http://localhost:8000/tests/browser/test-[name].html
   ```

## Unit Tests

Unit tests are located in `src/steps/__tests__/` and use Vitest:

```bash
npm test
```

## Adding New Tests

- **Browser tests**: Add HTML files to `tests/browser/`
- **Unit tests**: Add `.test.js` files to `src/steps/__tests__/` 