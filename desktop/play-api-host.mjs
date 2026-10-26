/* global process, URL */
/**
 * The play server's host: a process with no window and no network listener
 * that runs the request handler bundled by scripts/build-play-api.mjs.
 * Building a town holds a thread for tens of seconds, which in the main
 * process would freeze the window and menus. The packaged game and the
 * private hub both send each /api and /art request here (play-api-client.mjs)
 * and pass the reply back to the page.
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

// An Electron utility process talks over parentPort; a Node child process
// (the desktop tests) over its IPC channel. The handler is the same.
const send = (message) =>
  process.parentPort
    ? process.parentPort.postMessage(message)
    : process.send(message);

async function answer({ id, method, url }) {
  try {
    // Developer routes stay off: this is the installed game.
    const reply = await benchRequest(method, new URL(url), {
      developer: false,
    });
    send({ id, reply });
  } catch (error) {
    send({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

if (process.parentPort)
  process.parentPort.on("message", ({ data }) => answer(data));
else process.on("message", answer);
