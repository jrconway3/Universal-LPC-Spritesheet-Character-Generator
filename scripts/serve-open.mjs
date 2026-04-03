import { execa } from "execa";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import open from "open";

/** Preferred port; serve picks another if this one is in use (same as running `serve` without `--no-port-switching`). */
const DEFAULT_PORT = 8765;

const require = createRequire(import.meta.url);
const servePkg = dirname(require.resolve("serve/package.json"));
const serveCli = join(servePkg, "build", "main.js");

const execaDefaults = { reject: false, windowsHide: true };

/** Strip common ANSI sequences so we can parse URLs from chalk-styled `serve` output. */
function stripAnsi(s) {
  const esc = String.fromCharCode(27);
  return s.replace(new RegExp(`${esc}\\[[0-9;]*m`, "g"), "");
}

/** `serve` may print `http://0.0.0.0:port`; normalize for opening in a browser. */
function normalizeUrl(url) {
  return url.replace(/^http:\/\/0\.0\.0\.0:/, "http://localhost:");
}

/**
 * First URL printed by serve (Local / Accepting connections line), or null.
 * @param {string} text
 * @returns {string | null}
 */
function extractServeUrl(text) {
  const plain = stripAnsi(text);
  const m = plain.match(
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+/,
  );
  return m ? normalizeUrl(m[0]) : null;
}

/**
 * Waits until `serve` logs its public URL (after it has bound a port).
 * @param {import('execa').ResultPromise} subprocess
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
function waitForServeUrl(subprocess, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buf = "";
    let settled = false;

    const finish = (err, url) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(url);
    };

    const timer = setTimeout(() => {
      finish(new Error("Timed out waiting for serve to print its URL."));
    }, timeoutMs);

    const onData = (chunk) => {
      process.stdout.write(chunk);
      buf += chunk.toString();
      const url = extractServeUrl(buf);
      if (url) {
        subprocess.stdout?.off("data", onData);
        finish(undefined, url);
      }
    };

    subprocess.stdout?.on("data", onData);
    subprocess.stderr?.on("data", (c) => process.stderr.write(c));

    subprocess.once("exit", (code, signal) => {
      subprocess.stdout?.off("data", onData);
      if (settled) return;
      const url = extractServeUrl(buf);
      if (url) {
        finish(undefined, url);
      } else {
        finish(
          new Error(
            `serve exited (${signal ? signal : code}) before printing a URL.`,
          ),
        );
      }
    });

    subprocess.once("error", (err) => {
      finish(err);
    });
  });
}

async function main() {
  const preferredPort = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  if (Number.isNaN(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    console.error("Invalid PORT.");
    process.exit(1);
  }

  const serveChild = execa(
    process.execPath,
    [serveCli, "-l", String(preferredPort)],
    {
      ...execaDefaults,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
    },
  );

  const forward = (signal) => {
    if (serveChild.pid && !serveChild.killed) {
      serveChild.kill(signal);
    }
  };
  process.on("SIGINT", () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));

  let url;
  try {
    url = await waitForServeUrl(serveChild, 25_000);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    forward("SIGTERM");
    process.exit(1);
  }

  await open(url);

  const result = await serveChild;
  const code = result.exitCode ?? (result.signal ? 1 : 0);
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
