/* global process */
/**
 * The unsigned Mac app's update install, wired to the file system. The
 * decisions live in mac-swap.mjs; this file downloads the release zip,
 * checks its sha512, unpacks it with ditto, ad-hoc signs the bundle so
 * Gatekeeper accepts it, and on quit starts the swap helper.
 *
 * It presents the same four calls the shared update flow (updater.mjs) makes
 * of electron-updater, so the flow and its dialogs are one for both systems.
 */

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  accessSync,
  constants,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  planMacSwap,
  releaseFileUrl,
  sha512Matches,
  swapScript,
} from "./mac-swap.mjs";

function folderWritable(bundle) {
  if (!bundle) return false;
  try {
    accessSync(path.dirname(bundle), constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * deps: autoUpdater (electron-updater, used to read the feed only), fetch
 * (Electron's net.fetch), feed ({ owner, repo }), workRoot (a temp folder),
 * onQuit(fn) (runs fn when the app quits), quit().
 */
export function macUpdater(deps) {
  let staged = null;
  let armed = false;
  let info = null;
  const startSwap = () => {
    if (!staged) return;
    const script = path.join(deps.workRoot, "swap.sh");
    writeFileSync(
      script,
      swapScript({
        pid: process.pid,
        bundle: staged.bundle,
        staged: staged.app,
        backup: `${staged.bundle}.previous`,
      }),
      { mode: 0o755 },
    );
    spawn("/bin/sh", [script], { detached: true, stdio: "ignore" }).unref();
    staged = null;
  };
  deps.onQuit(() => {
    if (armed) startSwap();
  });
  return {
    async checkForUpdates() {
      const result = await deps.autoUpdater.checkForUpdates();
      info = result?.updateInfo ?? null;
      return result;
    },
    async downloadUpdate() {
      const plan = planMacSwap({
        execPath: process.execPath,
        arch: process.arch,
        updateInfo: info,
        folderWritable: folderWritable(
          path.resolve(process.execPath, "../../.."),
        ),
      });
      if (plan.action !== "swap") throw new Error(`mac-swap: ${plan.reason}`);
      rmSync(deps.workRoot, { recursive: true, force: true });
      mkdirSync(deps.workRoot, { recursive: true });
      const zipPath = path.join(deps.workRoot, "update.zip");
      const url = releaseFileUrl({
        ...deps.feed,
        tag: info.tag ?? `v${info.version}`,
        name: plan.zip.url,
      });
      const response = await deps.fetch(url);
      if (!response.ok || !response.body)
        throw new Error(`Download failed: HTTP ${response.status}`);
      const hash = createHash("sha512");
      await pipeline(
        Readable.fromWeb(response.body),
        new Transform({
          transform(chunk, _encoding, done) {
            hash.update(chunk);
            done(null, chunk);
          },
        }),
        createWriteStream(zipPath),
      );
      if (!sha512Matches(hash.digest("base64"), plan.zip.sha512))
        throw new Error("The download's sha512 does not match the release.");
      const unpacked = path.join(deps.workRoot, "unpacked");
      execFileSync("/usr/bin/ditto", ["-x", "-k", zipPath, unpacked]);
      rmSync(zipPath, { force: true });
      const name = readdirSync(unpacked).find((entry) =>
        entry.endsWith(".app"),
      );
      if (!name) throw new Error("The release zip holds no app.");
      const app = path.join(unpacked, name);
      execFileSync("/usr/bin/xattr", ["-dr", "com.apple.quarantine", app]);
      execFileSync("/usr/bin/codesign", [
        "--force",
        "--deep",
        "--sign",
        "-",
        app,
      ]);
      if (!existsSync(path.join(app, "Contents", "MacOS")))
        throw new Error("The unpacked app is incomplete.");
      staged = { bundle: plan.bundle, app };
      return [app];
    },
    setAutoInstallOnAppQuit(value) {
      armed = value === true;
    },
    quitAndInstall() {
      armed = true;
      deps.quit();
    },
  };
}
