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
  launch_in_dev: ["Chrome", "Firefox", "Safari"],
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
        "--user-data-dir=/tmp",
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

module.exports = testemConfig;
