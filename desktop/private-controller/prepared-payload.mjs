/* global process */
/** Installs an already built client into the console without another Electron app.
 * Caller must stop the console first. Copies and verifies before touching state;
 * concurrent state changes abort registration, preserving the prior selection.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { assertProvenanceMatches } from "../../scripts/client-provenance.mjs";
import {
  cleanHubState,
  trackId,
  withPending,
  activatePending,
} from "./hub-model.mjs";
import {
  buildRecord,
  controllerPaths,
  buildPresentOnDisk,
} from "./private-update.mjs";

export function installPreparedPayload({
  stagedRoot,
  dataRoot,
  repositoryPath,
  branch,
  revision,
  privatePack,
  architecture = process.arch,
  beforeRegister = () => {},
}) {
  const id = trackId(branch);
  if (id === "main") throw new Error("Prepared previews cannot replace main.");
  const statePath = path.join(dataRoot, "state.json");
  const initialBytes = readFileSync(statePath);
  const state = cleanHubState(JSON.parse(initialBytes));
  if (!state) throw new Error("The console has no readable existing state.");
  const identity = JSON.parse(
    readFileSync(path.join(stagedRoot, "build-identity.json")),
  );
  if (
    identity.revision !== revision ||
    identity.dirty ||
    identity.profile !== "internal-art-review"
  )
    throw new Error(
      "Prepared client must match a clean private source revision.",
    );
  const { treeSha256, provenance } = assertProvenanceMatches({
    clientDir: path.join(stagedRoot, "client"),
    expectedRevision: revision,
    expectedDirty: false,
  });
  if (
    identity.clientTreeSha256 !== treeSha256 ||
    provenance.profile !== "internal-art-review"
  )
    throw new Error("Staged identity does not match the client tree.");
  if (
    !privatePack?.packId ||
    !/^[a-f0-9]{64}$/.test(privatePack.manifestSha256)
  )
    throw new Error("Verified private pack identity is required.");
  const paths = controllerPaths(dataRoot, revision, treeSha256.slice(0, 16));
  if (existsSync(paths.versionPath))
    throw new Error(
      "Prepared payload already exists; it will not be overwritten.",
    );
  const resources = path.join(paths.appPath, "Contents", "Resources");
  mkdirSync(resources, { recursive: true });
  cpSync(path.join(stagedRoot, "client"), path.join(resources, "client"), {
    recursive: true,
  });
  cpSync(
    path.join(stagedRoot, "build-identity.json"),
    path.join(resources, "build-identity.json"),
  );
  assertProvenanceMatches({
    clientDir: path.join(resources, "client"),
    expectedRevision: revision,
    expectedDirty: false,
  });
  const record = {
    delivery: "console-client-payload",
    preparedLocally: true,
    ...buildRecord(
      identity,
      paths.appPath,
      architecture,
      new Date().toISOString(),
    ),
    clientTreeSha256: treeSha256,
    privatePack,
  };
  if (!buildPresentOnDisk(record).ok)
    throw new Error("Copied payload failed presence verification.");
  beforeRegister();
  if (!readFileSync(statePath).equals(initialBytes))
    throw new Error(
      "Console state changed during installation; copied payload retained, selection untouched.",
    );
  const backup = `${statePath}.before-prepared-${revision.slice(0, 12)}-${Date.now()}`;
  writeFileSync(backup, initialBytes, { flag: "wx" });
  const next = {
    ...activatePending(withPending(state, id, branch, record), id),
    repositoryPath,
    selectedTrack: id,
  };
  const temporary = `${statePath}.prepared-${process.pid}`;
  writeFileSync(temporary, JSON.stringify(next, null, 2) + "\n", {
    flag: "wx",
  });
  renameSync(temporary, statePath);
  return {
    record,
    backup,
    selectedTrack: id,
    delivery: "console-client-payload",
  };
}
