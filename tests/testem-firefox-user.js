// Written into the Testem temp Firefox profile as user.js (see testem.cjs `firefox_user_js`).
// Includes Testem 3.20 defaults from known-browsers.js `firefoxSetup` plus touch prefs for
// PinchToZoom specs and CI stability prefs from browser_args.
/* global user_pref */

user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.cache.disk.smart_size.first_run", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
// Block the first-run “Welcome to Firefox” / Terms & privacy modal (preonboarding + TOU flow).
user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);
user_pref("termsofuse.bypassNotification", true);
user_pref("browser.preonboarding.enabled", false);
user_pref(
  "datareporting.policy.dataSubmissionPolicyNotifiedTime",
  "1481830156314",
);
user_pref("app.update.auto", false);
user_pref("app.update.enabled", false);
user_pref("browser.EULA.override", true);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
user_pref("browser.aboutwelcome.enabled", false);
user_pref("browser.startup.homepage", "about:blank");
user_pref("browser.startup.page", 0);
user_pref("browser.startup.firstrunSkipsHomepage", true);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("browser.startup.homepage_welcome_url", "");
user_pref("browser.startup.homepage_welcome_url.additional", "");
user_pref("browser.startup.cohort", "ignore");
user_pref("browser.messaging-system.prompts.enabled", false);
user_pref("browser.onboarding.enabled", false);
user_pref("browser.tour.enabled", false);
user_pref("browser.startup.upgradeDialog.enabled", false);
user_pref("browser.uiCustomization.skipDefaultState", true);
user_pref("toolkit.telemetry.enabled", false);
user_pref("toolkit.telemetry.unified", false);
user_pref("browser.ping-centre.telemetry", false);
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("browser.tabs.warnOnClose", false);
user_pref("browser.tabs.warnOnCloseOtherTabs", false);
user_pref("browser.tabs.warnOnOpen", false);
user_pref("browser.download.manager.showWhenStarting", false);
user_pref("extensions.update.enabled", false);
user_pref("dom.webnotifications.enabled", false);
user_pref("gfx.direct2d.disabled", true);

// Headless / CI stability (matches former testem Firefox ci flags)
user_pref("layers.acceleration.disabled", true);
user_pref("media.hardware-video-decoding.enabled", false);

// Synthetic TouchEvent / Touch for browser tests (dom.w3c_touch_events.enabled: 0=off, 1=on, 2=autodetect)
user_pref("dom.w3c_touch_events.enabled", 1);
user_pref("dom.w3c_touch_events.legacy_apis.enabled", true);
