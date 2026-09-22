import { Buffer } from "node:buffer";
import type { Plugin, ViteDevServer } from "vite";
import {
  loadContent,
  serveRuntimeContent,
  type LoadedContent,
} from "../../desktop/runtime-content.mjs";

type MiddlewareHost = { readonly middlewares: ViteDevServer["middlewares"] };

/**
 * The selected artwork snapshot, served on the page's OWN origin.
 *
 * The installed client already serves `/__content` from `desktop/
 * runtime-content.mjs` at `app://game`. A browser had no such route, so
 * `initializeRuntimeArt` had nothing to fetch and every browser session — the
 * dev server, `vite preview`, and the preview Antigravity opens — composed
 * from the bundled art no matter which pack was received. Three consumers,
 * three answers about what the game looks like.
 *
 * This mounts the SAME loader on the dev and preview servers. It does not
 * read, hash, validate or serve anything itself: `loadContent` verifies every
 * blob against the manifest it was received under, and `serveRuntimeContent`
 * decides what may be returned, with the same path grammar, MIME allowlist,
 * `nosniff`, sandboxed CSP and immutable caching the client uses. What differs
 * is the host it answers for, and nothing else.
 *
 * It mounts only when the session names a snapshot:
 *
 *   PG_RUNTIME_CONTENT_CACHE   the cache directory `receiveContent` wrote
 *   PG_RUNTIME_CONTENT_ID      the sha256 of the manifest it published
 *
 * With neither set there is no route, `/__content/manifest.json` 404s, and the
 * page falls back to the bundled art exactly as it always did. With both set
 * and the snapshot unreadable the server refuses to start rather than serving
 * a session that would quietly draw the previous generation.
 */
export function runtimeContentOrigin(
  environment: NodeJS.ProcessEnv = process.env,
): Plugin {
  const cacheRoot = environment.PG_RUNTIME_CONTENT_CACHE;
  const id = environment.PG_RUNTIME_CONTENT_ID;
  let loaded: LoadedContent | null = null;

  const mount = (server: MiddlewareHost) => {
    const snapshot = loaded;
    if (!snapshot) return;
    server.middlewares.use((request, response, next) => {
      const url = request.url ?? "";
      if (!url.startsWith("/__content/")) return next();
      const host = request.headers.host ?? "localhost";
      const result = serveRuntimeContent(
        snapshot,
        new Request(`http://${host}${url}`, { method: request.method }),
        { host },
      ) as Response;
      response.statusCode = result.status;
      result.headers.forEach((value, name) => response.setHeader(name, value));
      result
        .arrayBuffer()
        .then((body) => response.end(Buffer.from(body)))
        .catch(next);
    });
  };

  return {
    name: "ocd-runtime-content-origin",
    configResolved() {
      if (!cacheRoot && !id) return;
      if (!cacheRoot || !id)
        throw new Error(
          "PG_RUNTIME_CONTENT_CACHE and PG_RUNTIME_CONTENT_ID must be set together.",
        );
      // Verifies every blob now, at startup, so a corrupt or partial cache is
      // a server that does not start rather than a page that draws the wrong
      // people. `loadContent` is the client's own check, not a copy of it.
      loaded = loadContent({
        schema: "ocd-runtime-art/v1",
        id,
        cacheRoot,
      });
    },
    configureServer: mount,
    configurePreviewServer: mount,
  };
}
