import {
  debugLog,
  debugWarn,
  debugGroup,
  debugGroupEnd,
  debugTable,
} from "./utils/debug.js";

/**
 * Performance Profiler for LPC Spritesheet Generator
 *
 * - {@link PerformanceProfiler}: real-time monitoring (marks/measures, FPS) when enabled.
 * - {@link createZipExportProfiler}: phase timings for ZIP export (metadata.json + optional DEBUG table).
 *
 * Usage (global profiler):
 *   import { PerformanceProfiler } from './performance-profiler.js';
 *   const profiler = new PerformanceProfiler({ enabled: true });
 *   profiler.mark('operation:start');
 *   profiler.mark('operation:end');
 *   profiler.measure('operation', 'operation:start', 'operation:end');
 *
 * Usage (ZIP export):
 *   import { createZipExportProfiler } from './performance-profiler.js';
 *   const zipProfiler = createZipExportProfiler('splitAnimations');
 *   await zipProfiler.phase('drawAndSlice', async () => { ... });
 *   zipProfiler.syncPhase('render_composite_extractAnimationFromCanvas', () => { ... });
 *   zipProfiler.incrementCounter('pngEncodeCount');
 */

export class PerformanceProfiler {
  constructor(options = {}) {
    this.enabled = options.enabled ?? false; // Default: disabled
    this.logSlowOperations = options.logSlowOperations !== false;
    this.slowThresholdMs = options.slowThresholdMs || 50;
    this.verbose = options.verbose || false;

    // Track metrics
    this.metrics = {
      imageLoads: { count: 0, totalTime: 0 },
      draws: { count: 0, totalTime: 0 },
      previews: { count: 0, totalTime: 0 },
      domUpdates: { count: 0, totalTime: 0 },
    };

    // FPS monitoring
    this.fpsFrames = 0;
    this.fpsStartTime = null;
    this.currentFps = 0;

    if (this.enabled) {
      this._initializeFPSMonitor();
      debugLog("📊 Performance Profiler enabled");
      debugLog('💡 Type "profiler.report()" in console for summary.');
    }
  }

  /**
   * Enable profiler at runtime
   */
  enable() {
    if (!this.enabled) {
      this.enabled = true;
      this._initializeFPSMonitor();
      debugLog("📊 Performance Profiler enabled");
      debugLog('💡 Type "profiler.report()" in console for summary.');
    }
  }

  /**
   * Disable profiler at runtime
   */
  disable() {
    if (this.enabled) {
      this.enabled = false;
      debugLog("📊 Performance Profiler disabled");
    }
  }

  /**
   * Create a performance mark (appears in DevTools timeline)
   */
  mark(name) {
    if (!this.enabled) return;

    try {
      performance.mark(name);
      if (this.verbose) {
        debugLog(`🔵 Mark: ${name}`);
      }
    } catch (e) {
      debugWarn("Performance.mark failed:", e);
    }
  }

  /**
   * Measure time between two marks.
   * `renderCharacter` is bracketed only around compositing work (not dynamic-import latency).
   * `image-load:…` pairings require unique mark names; duplicate fetches of the same URL are
   * deduplicated in `load-image.js` so one span per network load.
   */
  measure(measureName, startMark, endMark) {
    if (!this.enabled) return null;

    try {
      performance.measure(measureName, startMark, endMark);

      // Get the measurement
      const measures = performance.getEntriesByName(measureName, "measure");
      if (measures.length > 0) {
        const measure = measures[measures.length - 1];
        const duration = measure.duration;

        // Log slow operations
        if (this.logSlowOperations && duration > this.slowThresholdMs) {
          debugWarn(
            `⚠️ Slow operation: ${measureName} took ${duration.toFixed(2)}ms`,
          );
        } else if (this.verbose) {
          debugLog(`⏱️ ${measureName}: ${duration.toFixed(2)}ms`);
        }

        // Track in metrics
        this._trackMetric(measureName, duration);

        return duration;
      }
    } catch (e) {
      debugWarn("Performance.measure failed:", e);
    }

    return null;
  }

  /**
   * Track metric by category
   */
  _trackMetric(name, duration) {
    // Categorize the metric
    let category = null;
    if (name.includes("image") || name.includes("load")) {
      category = "imageLoads";
    } else if (name.includes("draw") || name.includes("render")) {
      category = "draws";
    } else if (name.includes("preview")) {
      category = "previews";
    } else if (
      name.includes("dom") ||
      name.includes("filter") ||
      name.includes("show")
    ) {
      category = "domUpdates";
    }

    if (category && this.metrics[category]) {
      this.metrics[category].count++;
      this.metrics[category].totalTime += duration;
    }
  }

  /**
   * Initialize FPS monitoring
   */
  _initializeFPSMonitor() {
    this.fpsStartTime = performance.now();

    const countFrame = () => {
      this.fpsFrames++;
      requestAnimationFrame(countFrame);
    };
    requestAnimationFrame(countFrame);

    // Report FPS every 2 seconds
    setInterval(() => {
      const now = performance.now();
      const elapsed = (now - this.fpsStartTime) / 1000;
      this.currentFps = Math.round(this.fpsFrames / elapsed);

      if (this.verbose) {
        const fpsEmoji =
          this.currentFps >= 55 ? "✅" : this.currentFps >= 30 ? "⚠️" : "❌";
        debugLog(`${fpsEmoji} FPS: ${this.currentFps}`);
      }

      // Reset
      this.fpsFrames = 0;
      this.fpsStartTime = now;
    }, 2000);
  }

  /**
   * Get current FPS
   */
  getFPS() {
    return this.currentFps;
  }

  /**
   * Get memory usage (Chrome only)
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize:
          (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + " MB",
        totalJSHeapSize:
          (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + " MB",
        jsHeapSizeLimit:
          (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + " MB",
      };
    }
    return null;
  }

  /**
   * Print comprehensive performance report
   */
  report() {
    if (!this.enabled) {
      debugLog("Performance profiler is disabled");
      return;
    }

    debugGroup("📊 Performance Report");

    // Summary by category
    debugGroup("⏱️ Timing Summary");
    for (const [category, data] of Object.entries(this.metrics)) {
      if (data.count > 0) {
        const avg = (data.totalTime / data.count).toFixed(2);
        debugLog(
          `${category}: ${data.count} ops, ${data.totalTime.toFixed(2)}ms total, ${avg}ms avg`,
        );
      }
    }
    debugGroupEnd();

    // FPS
    debugLog(`\n🎬 Current FPS: ${this.currentFps}`);

    // Memory (Chrome only)
    const memory = this.getMemoryUsage();
    if (memory) {
      debugGroup("💾 Memory Usage");
      debugTable(memory);
      debugGroupEnd();
    }

    // All measures
    const allMeasures = performance.getEntriesByType("measure");
    if (allMeasures.length > 0) {
      debugGroup(`📏 All Measurements (${allMeasures.length} total)`);

      // Sort by duration
      const sorted = allMeasures
        .map((m) => ({ name: m.name, duration: m.duration }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 20); // Top 20

      debugTable(
        sorted.map((m) => ({
          Operation: m.name,
          "Duration (ms)": m.duration.toFixed(2),
        })),
      );
      debugGroupEnd();
    }

    debugLog(
      "\n💡 Tip: Open DevTools → Performance tab and click Record to see visual timeline",
    );
    debugGroupEnd();
  }

  /**
   * Clear all performance marks and measures
   */
  clear() {
    if (!this.enabled) return;

    try {
      performance.clearMarks();
      performance.clearMeasures();
      this.metrics = {
        imageLoads: { count: 0, totalTime: 0 },
        draws: { count: 0, totalTime: 0 },
        previews: { count: 0, totalTime: 0 },
        domUpdates: { count: 0, totalTime: 0 },
      };
      debugLog("🧹 Performance data cleared");
    } catch (e) {
      debugWarn("Failed to clear performance data:", e);
    }
  }
}

function zipProfilerNowMs() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }
  return Date.now();
}

function zipProfilerRoundMs(ms) {
  return Math.round(ms * 10) / 10;
}

/** Default keys so ZIP profile JSON has a stable `counters` shape (zeros omitted until first increment). */
const ZIP_EXPORT_COUNTER_KEYS = [
  "pngEncodeCount",
  "totalPngBytes",
  "drawAndSliceCount",
  "zipFileEntryCount",
  "renderExtractAnimationFromCanvasCalls",
  "renderSingleItemCalls",
  "renderSingleItemAnimationCalls",
  "extractFramesFromAnimationBatchCount",
  "renderSliceCanvasForCustomAnimCalls",
];

/**
 * High-resolution phase timings for ZIP export. Safe in tests (no User Timing side effects unless DEBUG).
 *
 * @param {string} exportKind — e.g. `splitAnimations` (for logging / optional performance marks)
 */
export function createZipExportProfiler(exportKind) {
  const t0 = zipProfilerNowMs();
  /** @type {Record<string, number>} */
  const phases = {};
  /** @type {Record<string, number>} */
  const counters = {};

  function userMark(suffix) {
    if (
      typeof performance === "undefined" ||
      typeof performance.mark !== "function" ||
      typeof window === "undefined" ||
      !window.DEBUG
    ) {
      return;
    }
    try {
      performance.mark(`zip:${exportKind}:${suffix}`);
    } catch {
      /* ignore quota / duplicate mark */
    }
  }

  /**
   * @param {string} name
   * @param {() => void | Promise<void>} fn
   */
  async function phase(name, fn) {
    const start = zipProfilerNowMs();
    userMark(`${name}-start`);
    try {
      await fn();
    } finally {
      const elapsed = zipProfilerNowMs() - start;
      phases[name] = (phases[name] ?? 0) + elapsed;
      userMark(`${name}-end`);
    }
  }

  /**
   * Like {@link phase} but for synchronous work (no `await` inside `fn`).
   * @template T
   * @param {string} name
   * @param {() => T} fn
   * @returns {T}
   */
  function syncPhase(name, fn) {
    const start = zipProfilerNowMs();
    userMark(`${name}-start`);
    try {
      return fn();
    } finally {
      const elapsed = zipProfilerNowMs() - start;
      phases[name] = (phases[name] ?? 0) + elapsed;
      userMark(`${name}-end`);
    }
  }

  /**
   * @param {string} name
   * @param {number} [delta]
   */
  function incrementCounter(name, delta = 1) {
    counters[name] = (counters[name] ?? 0) + delta;
  }

  /**
   * @param {string} name
   * @param {number} amount
   */
  function addCounter(name, amount) {
    counters[name] = (counters[name] ?? 0) + amount;
  }

  function totalMs() {
    return zipProfilerNowMs() - t0;
  }

  /**
   * Snapshot for metadata.json (deterministic rounding).
   * Call before `generateZip` so the zip does not embed compression time (avoids a second `generateAsync`).
   */
  function toMetadata() {
    const phasesRounded = {};
    for (const [k, v] of Object.entries(phases)) {
      phasesRounded[k] = zipProfilerRoundMs(v);
    }
    const countersOut = {};
    for (const k of ZIP_EXPORT_COUNTER_KEYS) {
      countersOut[k] = 0;
    }
    for (const [k, v] of Object.entries(counters)) {
      countersOut[k] = Number.isInteger(v) ? v : zipProfilerRoundMs(v);
    }
    return {
      exportKind,
      /** Wall time for recorded phases only (typically everything except JSZip compression). */
      totalMs: zipProfilerRoundMs(totalMs()),
      phasesMs: phasesRounded,
      counters: countersOut,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
  }

  /** Pretty console report when `window.DEBUG` is set. */
  function logReport() {
    if (typeof window === "undefined" || !window.DEBUG) return;
    const meta = toMetadata();
    debugGroup(`ZIP export profile: ${exportKind} (${meta.totalMs} ms total)`);
    const rows = Object.entries(meta.phasesMs).map(([phase, ms]) => ({
      phase,
      ms,
    }));
    rows.sort((a, b) => b.ms - a.ms);
    debugTable(rows);
    if (meta.counters && Object.keys(meta.counters).length > 0) {
      const cRows = Object.entries(meta.counters).map(([name, value]) => ({
        counter: name,
        value,
      }));
      cRows.sort((a, b) => a.counter.localeCompare(b.counter));
      debugTable(cRows);
    }
    debugGroupEnd();
  }

  return {
    phase,
    syncPhase,
    incrementCounter,
    addCounter,
    toMetadata,
    logReport,
  };
}
