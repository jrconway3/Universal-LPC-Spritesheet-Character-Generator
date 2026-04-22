import fs from "node:fs";
import path from "node:path";

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".lpcr": "application/json",
};

/**
 * Vite 8+ preview can return 500 for /spritesheets/* when the default static path hits
 * `scandir` (e.g. EPERM) while resolving files under `dist/spritesheets/`. This middleware:
 * - serves matching paths with `fs.stat` + `createReadStream` only (no directory reads);
 * - tries `dist/<rel>` first, then the repo’s `spritesheets/<rest>` (same layout as `vite` dev);
 * - responds with 404 when the file is missing, instead of `next()` (avoids fall-through 500s).
 * @returns {import("vite").Plugin}
 */
export function vitePluginPreviewServeDistSpritesheets() {
  return {
    name: "preview-serve-dist-spritesheets",
    enforce: "pre",
    configurePreviewServer(server) {
      const projectRoot = path.resolve(server.config.root);
      const distRoot = path.join(projectRoot, "dist");
      const distSpritesheetsBase = path.join(distRoot, "spritesheets");
      const repoSpritesheetsBase = path.join(projectRoot, "spritesheets");

      const serveSpritesheets = (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          return next();
        }
        const raw = req.url?.split("?")[0] ?? "";
        let pathname;
        try {
          pathname = new URL(raw, "http://preview.local").pathname;
        } catch {
          return next();
        }
        if (!pathname.startsWith("/spritesheets/")) {
          return next();
        }

        const rel = decodeURIComponent(pathname).replace(/^\//, "");
        if (rel.includes("..") || path.isAbsolute(rel)) {
          return next();
        }
        if (!rel.startsWith("spritesheets/")) {
          return next();
        }

        const candidates = [
          path.join(distRoot, rel),
          path.join(projectRoot, rel),
        ];

        const isAllowed = (filePath) => {
          if (filePath.startsWith(distSpritesheetsBase + path.sep)) {
            return true;
          }
          if (filePath.startsWith(repoSpritesheetsBase + path.sep)) {
            return true;
          }
          return false;
        };

        const sendFile = (filePath, st) => {
          const ext = path.extname(filePath).toLowerCase();
          res.setHeader(
            "Content-Type",
            MIME[ext] || "application/octet-stream",
          );
          if (st.size >= 0) {
            res.setHeader("Content-Length", String(st.size));
          }
          if (req.method === "HEAD") {
            res.statusCode = 200;
            res.end();
            return;
          }
          res.statusCode = 200;
          const stream = fs.createReadStream(filePath);
          stream.on("error", next);
          stream.pipe(res);
        };

        const tryIndex = (i) => {
          if (i >= candidates.length) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Not found");
            return;
          }
          const filePath = path.normalize(candidates[i]);
          if (!isAllowed(filePath)) {
            return tryIndex(i + 1);
          }
          fs.stat(filePath, (err, st) => {
            if (err || !st.isFile()) {
              return tryIndex(i + 1);
            }
            sendFile(filePath, st);
          });
        };

        tryIndex(0);
      };

      const app = server.middlewares;
      const stack = app.stack;
      if (Array.isArray(stack)) {
        stack.unshift({ route: "", handle: serveSpritesheets });
      } else {
        app.use(serveSpritesheets);
      }
    },
  };
}
