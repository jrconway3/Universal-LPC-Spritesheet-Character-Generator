# Performance Profiling

## How to Enable Profiling

The app includes a performance profiler that is automatically enabled when:
1. Running on localhost (127.0.0.1 or localhost)
2. Adding `?debug=true` to the URL query string (overrides localhost detection)
3. Adding `?debug=false` to disable it even on localhost

The DEBUG flag and profiler are initialized in `sources/main.js`.

## Profiled Operations

The profiler tracks these expensive operations:

### Image Loading
- **Operation:** `loadImage()` in `sources/canvas/renderer.js`
- **Measures:** Individual image load times
- **Format:** `image-load:<path>`

### Character Rendering
- **Operation:** `renderCharacter()` in `sources/canvas/renderer.js`
- **Measures:** Total rendering time including image loading and canvas operations
- **Format:** `renderCharacter`

### ZIP export (download packs)

ZIP generation uses **`createZipExportProfiler`** in `sources/performance-profiler.js`, wired from `sources/state/zip.js` (split-by-animation, split-by-item, split-by-animation-and-item, individual frames).

- **Embedded timings:** Exports that write `credits/metadata.json` include a **`performance`** object (`exportKind`, `totalMs`, `phasesMs`, `userAgent`). Open the downloaded zip → `credits/metadata.json` → **`performance.phasesMs`** to see per-phase milliseconds. Phases cover work **before** JSZip `generateAsync` (compression is not included in that JSON, to avoid double compression).
- **Console (DEBUG):** With `window.DEBUG` true (localhost or `?debug=true`), finishing an export logs a **ZIP export profile** table in the console (phases sorted by duration).
- **User Timing:** With DEBUG on, phases also emit `performance.mark` names like `zip:<exportKind>:<phase>-start` / `-end`, visible under **DevTools → Performance** when recording.
- **Split-by-item sheets** does not add `metadata.json`; use the console table and Performance marks when DEBUG is on.

Query param note: only **`?debug=true`** and **`?debug=false`** are recognized as overrides (`sources/utils/debug.js`). Other values (e.g. `?debug=1`) fall through to localhost detection.

## Using the Profiler

### Via Browser Console

1. Enable DEBUG mode (see above)
2. Open the browser console (F12)
3. Perform actions in the app (change selections, render character, etc.)
4. Use these commands:

```javascript
// Full report (categories, FPS, User Timing measures)
window.profiler.report();

// Inspect measures by name (Performance API — not a method on profiler)
performance.getEntriesByName("renderCharacter", "measure");

// Clear marks/measures and reset in-profiler metrics
window.profiler.clear();

// Check if profiler is enabled
window.profiler.enabled;

// Enable/disable profiler manually
window.profiler.enable();
window.profiler.disable();
```

### Configuration

The profiler is configured in `sources/main.js`:

```javascript
const profiler = new window.PerformanceProfiler({
  enabled: DEBUG,           // Enable/disable profiler
  verbose: false,           // Log all marks/measures to console
  logSlowOperations: true   // Log warnings for slow operations
});
```

## Example Output

With **`verbose: true`** in `main.js` (or if a measure exceeds `slowThresholdMs`), you may see timing lines in the console. Slow-operation warnings use the configured threshold (default 50ms).

Call **`window.profiler.report()`** to open grouped console output: category totals (imageLoads, draws, etc.), current FPS, optional memory (Chrome), and a table of recent **`performance.measure`** entries from the User Timing API.

ZIP exports with DEBUG on log a separate group, e.g. **`ZIP export profile: splitAnimations (… ms total)`**, with a **`phase` / `ms`** table.

## Adding New Profiling Points

To profile a new operation:

```javascript
// Mark start
const profiler = window.profiler;
if (profiler) {
  profiler.mark('myOperation:start');
}

// ... do expensive work ...

// Mark end and measure
if (profiler) {
  profiler.mark('myOperation:end');
  profiler.measure('myOperation', 'myOperation:start', 'myOperation:end');
}
```

## Tips

- Use meaningful operation names (e.g., `render-body`, `load-sprites`)
- Add profiling marks around suspected bottlenecks
- Use the profiler.report() to identify patterns and outliers
- Compare measurements before/after optimizations
