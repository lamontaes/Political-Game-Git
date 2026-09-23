/** Retire only new, receipt-owned payloads; historical folders need review. */
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { leaseUpdateWorkspace } from "./update-workspace.mjs";

const receiptName = ".ocd-client-payload.json";
const appName = "Our Civic Duty Internal Art Review.app";
const keyPattern = /^([a-f0-9]{40})-([a-f0-9]{16})$/;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function inventory(root) {
  const entries = [];
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const file = path.join(dir, name);
      if (file === path.join(root, receiptName)) continue;
      if (name === ".pin" || name === ".git")
        throw Error("Pinned evidence or source is present");
      const stat = lstatSync(file);
      const relative = path.relative(root, file);
      if (stat.isSymbolicLink())
        throw Error("Payload contains a symbolic link");
      if (stat.isDirectory()) {
        entries.push([relative, "directory"]);
        walk(file);
      } else if (stat.isFile())
        entries.push([
          relative,
          stat.size,
          stat.mode & 0o777,
          hash(readFileSync(file)),
        ]);
      else throw Error("Payload contains an unknown file type");
    }
  }
  walk(root);
  return entries;
}

function versionsRoot(dataRoot) {
  if (lstatSync(dataRoot).isSymbolicLink())
    throw Error("Refusing aliased controller root");
  const root = realpathSync(dataRoot);
  const versions = path.join(root, "versions");
  if (realpathSync(versions) !== versions)
    throw Error("Refusing aliased controller versions");
  return versions;
}

/** Call only for the newly created payload, never to adopt old directories. */
export function recordVersionOwnership(dataRoot, versionPath) {
  const versions = versionsRoot(dataRoot);
  if (lstatSync(versionPath).isSymbolicLink())
    throw Error("Refusing aliased version");
  const folder = realpathSync(versionPath);
  const key = keyPattern.exec(path.basename(folder));
  if (
    path.dirname(folder) !== versions ||
    !key ||
    realpathSync(folder) !== folder
  )
    throw Error("Unexpected version location");
  const identity = JSON.parse(
    readFileSync(
      path.join(folder, appName, "Contents/Resources/build-identity.json"),
    ),
  );
  if (
    identity.revision !== key[1] ||
    !identity.clientTreeSha256?.startsWith(key[2])
  )
    throw Error("Version identity does not match its directory");
  if (readdirSync(folder).some((name) => name !== appName))
    throw Error("Unknown version contents");
  writeFileSync(
    path.join(folder, receiptName),
    JSON.stringify({
      schema: 1,
      revision: key[1],
      entries: inventory(folder),
    }) + "\n",
    { flag: "wx", mode: 0o600 },
  );
}

function references(dataRoot) {
  const files = [path.join(dataRoot, "state.json")];
  const received = path.join(dataRoot, "received");
  if (existsSync(received)) {
    if (realpathSync(received) !== received)
      throw Error("Received records are aliased");
    for (const name of readdirSync(received).sort()) {
      if (name.endsWith(".json")) files.push(path.join(received, name));
    }
  }
  const texts = files.map((file) => {
    if (lstatSync(file).isSymbolicLink()) throw Error("Reference is aliased");
    return readFileSync(file, "utf8");
  });
  const state = JSON.parse(texts[0]);
  if (state.schema !== 2 || !state.tracks || typeof state.tracks !== "object")
    throw Error("Unknown controller state");
  const paths = new Set();
  const revisions = new Set();
  const add = (build) => {
    if (!build) return;
    if (
      typeof build.appPath !== "string" ||
      !path.isAbsolute(build.appPath) ||
      !/^[a-f0-9]{40}$/.test(build.revision)
    )
      throw Error("Unknown build reference");
    paths.add(path.resolve(build.appPath));
    revisions.add(build.revision);
  };
  for (const track of Object.values(state.tracks)) {
    if (!track || typeof track !== "object") throw Error("Unknown track");
    for (const slot of ["current", "previous", "pending"]) add(track[slot]);
  }
  for (const text of texts.slice(1)) {
    const channel = JSON.parse(text);
    add(channel.build);
    if (!channel.build) throw Error("Unknown received record");
    if (channel.base?.revision) revisions.add(channel.base.revision);
  }
  return {
    paths,
    revisions,
    fingerprint: JSON.stringify(files.map((file, i) => [file, hash(texts[i])])),
  };
}

/** The lease excludes every updater. Live Play revisions are supplied by the hub. */
export function retireOwnedVersions({ dataRoot, activeRevisions = [] }) {
  const release = leaseUpdateWorkspace(dataRoot);
  try {
    const versions = versionsRoot(dataRoot);
    dataRoot = realpathSync(dataRoot);
    const initial = references(dataRoot);
    const active = new Set(activeRevisions);
    const kept = [],
      removed = [];
    for (const name of readdirSync(versions).sort()) {
      const folder = path.join(versions, name);
      const key = keyPattern.exec(name);
      if (
        !key ||
        lstatSync(folder).isSymbolicLink() ||
        !lstatSync(folder).isDirectory()
      )
        continue;
      const receipt = path.join(folder, receiptName);
      if (!existsSync(receipt)) {
        kept.push({ path: folder, reason: "historical or unowned" });
        continue;
      }
      try {
        const current = references(dataRoot);
        if (current.fingerprint !== initial.fingerprint)
          throw Error("References changed during retention");
        if (
          current.revisions.has(key[1]) ||
          current.paths.has(path.join(folder, appName)) ||
          active.has(key[1])
        ) {
          kept.push({ path: folder, reason: "referenced or active" });
          continue;
        }
        if (
          realpathSync(folder) !== folder ||
          lstatSync(receipt).isSymbolicLink()
        )
          throw Error("Version path changed");
        const owned = JSON.parse(readFileSync(receipt, "utf8"));
        if (
          owned.schema !== 1 ||
          owned.revision !== key[1] ||
          !Array.isArray(owned.entries)
        )
          throw Error("Unknown ownership receipt");
        if (
          readdirSync(folder).some(
            (entry) => ![appName, receiptName].includes(entry),
          )
        )
          throw Error("Unknown version contents");
        const actual = inventory(folder);
        if (JSON.stringify(actual) !== JSON.stringify(owned.entries))
          throw Error("Version changed after receipt");
        if (references(dataRoot).fingerprint !== initial.fingerprint)
          throw Error("References changed before retirement");
        rmSync(folder, { recursive: true, force: false });
        removed.push(folder);
      } catch (error) {
        kept.push({ path: folder, reason: error.message });
      }
    }
    return { kept, removed };
  } finally {
    release();
  }
}
