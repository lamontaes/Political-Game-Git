/**
 * The direct-update seam, as decisions rather than wiring.
 *
 * Everything here is deliberately free of Electron so the update contract
 * can be proved deterministically (desktop/tests/updater.test.mjs):
 * activation gates, candidate assessment (downgrade and channel refusal),
 * and the full user-controlled check → ask → download → ask flow with
 * every failure surfaced instead of retried. main.mjs supplies the real
 * dialog/window/electron-updater dependencies.
 *
 * Proving this logic with fakes proves the logic only. On Windows the
 * updater is electron-updater's NSIS updater (differential download from the
 * release's blockmap); on a Mac it is mac-install.mjs, because the app is
 * unsigned and Squirrel.Mac refuses unsigned installs.
 */

/**
 * Whether the direct updater may run at all.
 *
 * Steam distribution hard-disables it regardless of configuration —
 * Steam owns delivery there. Otherwise it activates only when the
 * packaged update-config deliberately enables it AND names an https
 * endpoint.
 */
export function updateActivation(config, identity) {
  if (identity.distribution === "steam")
    return { active: false, reason: "steam" };
  if (config.enabled !== true) return { active: false, reason: "disabled" };
  if (typeof config.feedURL !== "string" || config.feedURL === "")
    return { active: false, reason: "no-feed" };
  if (!config.feedURL.startsWith("https://"))
    return { active: false, reason: "insecure-feed" };
  return { active: true, reason: "active" };
}

/**
 * Dotted-numeric version comparison with prerelease ordering: a
 * prerelease sorts below its release (0.3.0-rc.1 < 0.3.0), and prerelease
 * identifiers compare numerically when numeric, lexically otherwise.
 * Returns -1, 0, or 1; null when either side is not a version at all.
 */
export function compareVersions(a, b) {
  const parse = (value) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(
      String(value ?? ""),
    );
    if (!match) return null;
    return {
      core: [Number(match[1]), Number(match[2]), Number(match[3])],
      pre: match[4] ? match[4].split(".") : null,
    };
  };
  const va = parse(a);
  const vb = parse(b);
  if (va === null || vb === null) return null;
  for (let i = 0; i < 3; i += 1) {
    if (va.core[i] !== vb.core[i]) return va.core[i] < vb.core[i] ? -1 : 1;
  }
  if (va.pre === null && vb.pre === null) return 0;
  if (va.pre === null) return 1;
  if (vb.pre === null) return -1;
  const length = Math.max(va.pre.length, vb.pre.length);
  for (let i = 0; i < length; i += 1) {
    const ia = va.pre[i];
    const ib = vb.pre[i];
    if (ia === undefined) return -1;
    if (ib === undefined) return 1;
    const na = /^\d+$/.test(ia) ? Number(ia) : null;
    const nb = /^\d+$/.test(ib) ? Number(ib) : null;
    if (na !== null && nb !== null) {
      if (na !== nb) return na < nb ? -1 : 1;
    } else if (na !== null) return -1;
    else if (nb !== null) return 1;
    else if (ia !== ib) return ia < ib ? -1 : 1;
  }
  return 0;
}

/**
 * Whether a fetched update candidate may even be offered.
 *
 * Malformed metadata, a candidate from a channel other than this build's
 * trusted channel, and an equal-or-older candidate are all refused here —
 * a downgrade is never offered, because installing it over newer saves is
 * exactly the incompatible-save hazard the store refuses from the other
 * side.
 */
export function assessCandidate({ currentVersion, channel, updateInfo }) {
  if (typeof updateInfo !== "object" || updateInfo === null)
    return { action: "refuse", reason: "malformed-metadata" };
  const comparison = compareVersions(currentVersion, updateInfo.version);
  if (comparison === null)
    return { action: "refuse", reason: "malformed-metadata" };
  if (
    typeof updateInfo.channel === "string" &&
    updateInfo.channel !== "" &&
    updateInfo.channel !== channel
  )
    return { action: "refuse", reason: "untrusted-channel" };
  if (comparison === 0) return { action: "none", reason: "up-to-date" };
  if (comparison > 0) return { action: "refuse", reason: "downgrade" };
  return { action: "offer", reason: "newer" };
}

/**
 * The whole interactive flow, against injected dependencies.
 *
 * deps:
 *   activation           — updateActivation() result
 *   currentVersion       — this build's version
 *   channel              — this build's trusted channel
 *   loadUpdater()        — async; returns { checkForUpdates, downloadUpdate,
 *                          quitAndInstall, setAutoInstallOnAppQuit }
 *   ask(msg, detail, buttons) — async; resolves chosen button index
 *   notify(msg, detail)  — async info/warning surface
 *   line(key, facts)     — the shell's sentence for a key, from the shell bank
 *   mac                  — optional; true on the Mac, where installing replaces
 *                          the app in its folder
 *   holdQuit(on)         — optional; while on, closing the last window does
 *                          not quit the app (the install quits it)
 *   closeAllWindows()    — async; asks every window to close through the
 *                          normal close flow; resolves true only if all
 *                          actually closed (the game finished persisting)
 *
 * Returns a stable outcome string; every path surfaces its truth to the
 * player and none of them retries, deletes, or installs silently.
 */
export async function runUpdateCheck(deps) {
  const { activation } = deps;
  if (!activation.active) {
    await deps.notify(
      deps.line("update-not-configured"),
      deps.line(
        activation.reason === "steam"
          ? "update-not-configured-steam"
          : "update-not-configured-internal",
      ),
    );
    return activation.reason === "steam" ? "steam-disabled" : "not-configured";
  }

  let updater;
  let result;
  try {
    updater = await deps.loadUpdater();
    result = await updater.checkForUpdates();
  } catch (error) {
    await deps.notify(
      deps.line("update-check-failed"),
      String(error?.message ?? error),
    );
    return "metadata-error";
  }

  const assessment = assessCandidate({
    currentVersion: deps.currentVersion,
    channel: deps.channel,
    updateInfo: result?.updateInfo ?? null,
  });
  if (assessment.action === "refuse") {
    const detail = {
      "malformed-metadata": () => deps.line("update-refused-malformed"),
      "untrusted-channel": () =>
        deps.line("update-refused-untrusted", { channel: deps.channel }),
      downgrade: () =>
        deps.line("update-refused-downgrade", {
          offered: String(result?.updateInfo?.version),
          current: deps.currentVersion,
        }),
    }[assessment.reason]();
    await deps.notify(deps.line("update-refused"), detail);
    return `refused-${assessment.reason}`;
  }
  if (assessment.action === "none") {
    await deps.notify(
      deps.line("update-current"),
      deps.line("update-current-detail", { current: deps.currentVersion }),
    );
    return "up-to-date";
  }

  const wanted = await deps.ask(
    deps.line("update-available", { offered: result.updateInfo.version }),
    deps.line("update-available-detail"),
    ["Download", "Not now"],
  );
  if (wanted !== 0) return "declined";

  try {
    await updater.downloadUpdate();
  } catch (error) {
    await deps.notify(
      deps.line("update-download-failed"),
      deps.line("update-download-failed-detail", {
        error: String(error?.message ?? error),
      }),
    );
    return "download-failed";
  }

  const installNow = await deps.ask(
    deps.line("update-downloaded"),
    deps.line(deps.mac ? "update-install-mac" : "update-install-default"),
    ["Restart and install", "Later"],
  );
  if (installNow !== 0) {
    // Make the promise in the copy true: the verified download installs
    // on the player's own next quit, and not before.
    updater.setAutoInstallOnAppQuit(true);
    return "deferred-to-quit";
  }

  // Closing the last window must not quit the app before the install starts.
  deps.holdQuit?.(true);
  const allClosed = await deps.closeAllWindows();
  if (!allClosed) {
    deps.holdQuit?.(false);
    // A window declined to close (the game is mid-something). Keep the
    // player's install decision for their own quit instead of forcing it.
    updater.setAutoInstallOnAppQuit(true);
    await deps.notify(
      deps.line("update-finish-on-quit"),
      deps.line("update-finish-on-quit-detail"),
    );
    return "install-blocked-deferred";
  }
  updater.quitAndInstall();
  return "installing";
}
