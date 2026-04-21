import "chai";
import "../sources/vendor-globals.js";
import "../sources/install-item-metadata.js";

window.__TEST_DEBUG_LOCKED__ = true;
window.DEBUG = import.meta.env.VITEST_DEBUG === "true";
