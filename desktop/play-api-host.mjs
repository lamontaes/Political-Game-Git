/* global process, URL */
/**
 * The play server's host: an Electron utility process (no window, no network
 * listener) that runs the request handler bundled by scripts/build-play-api.mjs.
 * Building a town holds a thread for tens of seconds, which in the main
 * process would freeze the window and menus. The main process sends each
 * /api and /art request here over the process's message port and sends the
 * reply back to the page.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.OCD_PLAY_API_ROOT;
globalThis.__OCD_RUNTIME_ROOT__ = pathToFileURL(
  path.join(root, "runtime") + path.sep,
).href;
const { benchRequest } = await import(
  pathToFileURL(path.join(root, "play-api.mjs")).href
);

process.parentPort.on("message", async ({ data }) => {
  const { id, method, url } = data;
  try {
    // Developer routes stay off: this is the installed game.
    const reply = await benchRequest(method, new URL(url), {
      developer: false,
    });
    process.parentPort.postMessage({ id, reply });
  } catch (error) {
    process.parentPort.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
