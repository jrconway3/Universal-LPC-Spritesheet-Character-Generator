"use strict";

// Suppress app debug logs during tests by default (?debug=false), so localhost does not
// enable window.DEBUG via getDebugParam(). Set DEBUG=true or DEBUG=1 in the environment
// when launching testem to keep verbose debug output (same as opening tests_run.html without
// ?debug=false on localhost).
const testPageFromEnv =
  process.env.DEBUG === "true" || process.env.DEBUG === "1"
    ? "tests_run.html"
    : "tests_run.html?debug=false";

let testemConfig = {
  framework: "mocha+chai",
  test_page: testPageFromEnv,
  parallel: 2,
  debug: true,
  disable_watching: true,
  launch_in_ci: ["Chrome", "Firefox"],
  launch_in_dev: [
    "Chrome",
    "Firefox",
    ...(process.platform === "darwin" ? ["Safari"] : []),
  ],
  browser_start_timeout: 30,
  browser_args: {
    Chrome: {
      dev: [
        "--disable-popup-blocking",

        // Keep running tests even if tab is in background
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
      ci: [
        // needed to run ci mode locally on MacOS ARM
        process.env.CI ? null : "--use-gl=angle",

        "--headless",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-popup-blocking",
        "--mute-audio",
        "--remote-debugging-port=0",
        "--window-size=1680,1024",
        "--enable-logging=stderr",
        // Omit --user-data-dir: Testem already sets a per-run temp profile. A second flag breaks
        // Chrome on some setups (e.g. macOS), and /tmp is not valid on Windows.
      ].filter(Boolean),
    },
    Firefox: {
      dev: [],
      ci: [
        "-headless",
        "--no-sandbox",
        "--pref",
        "gfx.direct2d.disabled=true",
        "--pref",
        "layers.acceleration.disabled=true",
        "--pref",
        "media.hardware-video-decoding.enabled=false",
      ],
    },
  },
};

// Testem's stock Safari launcher opens a temp start.html via file://, which triggers macOS/Safari
// prompts. Launch the Testem HTTP URL with `open` instead.
if (process.platform === "darwin") {
  testemConfig.launchers = {
    Safari: {
      protocol: "browser",
      exe: "/usr/bin/open",
      args(_config, url) {
        return ["-a", "Safari", url];
      },
    },
  };
}

module.exports = testemConfig;
