import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { validateRevision } from "./private-update.mjs";

/** Read bundle metadata only, never the player's save profile. */
export function inspectInstalledBuild(build) {
  if (!build?.appPath)
    return {
      ready: false,
      identity: null,
      problem: "No installed build pointer.",
    };
  let identity;
  try {
    identity = JSON.parse(
      readFileSync(
        path.join(
          build.appPath,
          "Contents",
          "Resources",
          "build-identity.json",
        ),
        "utf8",
      ),
    );
  } catch {
    return {
      ready: false,
      identity: null,
      problem: "The installed bundle identity is missing or unreadable.",
    };
  }
  if (
    !validateRevision(identity.revision) ||
    identity.revision !== build.revision ||
    identity.profile !== build.profile ||
    identity.version !== build.version ||
    identity.dirty !== false ||
    identity.channel !== "internal" ||
    identity.distribution !== "direct" ||
    !/^[0-9a-f]{64}$/.test(identity.clientTreeSha256 ?? "")
  ) {
    return {
      ready: false,
      identity,
      problem:
        "The installed bundle does not match its verified pointer or private channel.",
    };
  }
  const executable = path.join(
    build.appPath,
    "Contents",
    "MacOS",
    "Our Civic Duty",
  );
  const framework = path.join(
    build.appPath,
    "Contents",
    "Frameworks",
    "Electron Framework.framework",
    "Versions",
    "Current",
    "Electron Framework",
  );
  if (!existsSync(executable) || !existsSync(framework)) {
    return {
      ready: false,
      identity,
      problem:
        "The installed executable or Electron framework is missing. Update can stage a replacement without touching saves.",
    };
  }
  return { ready: true, identity, problem: null };
}
