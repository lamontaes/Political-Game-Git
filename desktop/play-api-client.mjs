/* global process */
/**
 * The one way a desktop host talks to the play server (play-api-host.mjs):
 * the packaged game and the private hub both answer the page's /api and /art
 * requests through this, so New game and play behave the same in each.
 *
 * `fork(hostPath, root)` starts the host process for one bundled play-api
 * root and returns `{ send(message), on(event, listener), kill() }`: an
 * Electron utility process in the apps, a Node child process in tests. The
 * host starts on the first request so a window opens at once.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

export const PLAY_API_HOST = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "play-api-host.mjs",
);

/**
 * The play server's V8 young generation, in MiB: a played year allocates a
 * great many short-lived records, and the default size spends about a sixth
 * of the year collecting. Kept equal to `nodeSemiSpaceMiB` in
 * scripts/core2-guard/policies.json (a desktop test checks), which is where
 * the measurement is.
 */
export const PLAY_SERVER_SEMI_SPACE_MIB = 64;

/** The apps' fork: an Electron utility process for one play-api root. */
export function utilityFork(utilityProcess) {
  return (hostPath, root) => {
    const child = utilityProcess.fork(hostPath, [], {
      serviceName: "Our Civic Duty play server",
      execArgv: [`--max-semi-space-size=${PLAY_SERVER_SEMI_SPACE_MIB}`],
      env: { ...process.env, OCD_PLAY_API_ROOT: root },
      stdio: "inherit",
    });
    return {
      send: (message) => child.postMessage(message),
      on: (event, listener) => child.on(event, listener),
      kill: () => child.kill(),
    };
  };
}

export function createPlayApi({ root, fork }) {
  let host;
  const pending = new Map();
  let nextId = 0;
  const start = () => {
    const child = fork(PLAY_API_HOST, root);
    child.on("message", ({ id, reply, error }) => {
      const waiting = pending.get(id);
      pending.delete(id);
      if (error !== undefined) waiting?.reject(new Error(error));
      else waiting?.resolve(reply);
    });
    child.on("exit", (code) => {
      if (host === child) host = undefined;
      for (const waiting of pending.values())
        waiting.reject(new Error(`The play server stopped (exit ${code}).`));
      pending.clear();
    });
    return child;
  };
  /** @param {string} method @param {URL} url */
  function playApi(method, url) {
    host ??= start();
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      host.send({ id, method, url: url.href });
    });
  }
  playApi.stop = () => {
    host?.kill();
    host = undefined;
  };
  return playApi;
}
