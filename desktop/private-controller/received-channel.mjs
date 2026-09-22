/* global process */
/** Receiver-published compatible pairs; Git discovery is not content publication. */
import {
  readFileSync,
  existsSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  realpathSync,
  readdirSync,
  cpSync,
} from "node:fs";
import path from "node:path";
import { branchSlug, cleanHubState, withPending } from "./hub-model.mjs";
import { buildPresentOnDisk } from "./private-update.mjs";
import { assertProvenanceMatches } from "../../scripts/client-provenance.mjs";
import {
  loadContent,
  containedFile,
  CONTENT_CAPABILITY,
} from "../runtime-content.mjs";
export const CHANNEL_SCHEMA = "ocd-received-channel/v1";
/** Copy a clean compiled game once. Content is referenced, never copied here.
 * Publication is separate so verification can run before the owner sees it. */
export function stageReceivedCode({
  clientDir,
  dataRoot,
  revision,
  version,
  content,
}) {
  const { treeSha256, provenance } = assertProvenanceMatches({
    clientDir,
    expectedRevision: revision,
    expectedDirty: false,
  });
  if (
    provenance.profile !== "internal-art-review" ||
    provenance.runtimeArtCapability !== CONTENT_CAPABILITY
  )
    throw new Error("This payload is not a compatible private game");
  const versions = path.join(dataRoot, "versions");
  mkdirSync(versions, { recursive: true });
  const final = path.join(versions, `${revision}-${treeSha256.slice(0, 16)}`);
  const appName = "Our Civic Duty Internal Art Review.app";
  const appPath = path.join(final, appName);
  const build = {
    revision,
    version,
    appPath,
    profile: "internal-art-review",
    architecture: process.arch,
    installedAt: new Date().toISOString(),
    delivery: "console-client-payload",
    preparedLocally: true,
    clientTreeSha256: treeSha256,
    content,
  };
  if (!existsSync(final)) {
    const temporary = final + ".receiving-" + process.pid;
    const resources = path.join(temporary, appName, "Contents/Resources");
    mkdirSync(resources, { recursive: true });
    cpSync(clientDir, path.join(resources, "client"), {
      recursive: true,
      dereference: false,
    });
    const copied = assertProvenanceMatches({
      clientDir: path.join(resources, "client"),
      expectedRevision: revision,
      expectedDirty: false,
    });
    if (copied.treeSha256 !== treeSha256)
      throw new Error("Copied game changed");
    writeFileSync(
      path.join(resources, "build-identity.json"),
      JSON.stringify({
        revision,
        version,
        profile: build.profile,
        dirty: false,
        clientTreeSha256: treeSha256,
      }) + "\n",
      { flag: "wx" },
    );
    renameSync(temporary, final);
  }
  return verifyReceivedBuild(build, dataRoot);
}
export function channelPath(dataRoot, track) {
  if (!track.startsWith("branch:")) return null;
  return path.join(dataRoot, "received", branchSlug(track.slice(7)) + ".json");
}
export function verifyReceivedBuild(build, dataRoot) {
  if (receivedCodeNeedsContent(build, dataRoot)) loadContent(build.content);
  return build;
}
/** The same checks; the ~1 GB of artwork is verified by `verifyContent`
 * (asynchronously in the hub, so its window never freezes). */
export async function verifyReceivedBuildAsync(build, dataRoot, verifyContent) {
  if (receivedCodeNeedsContent(build, dataRoot))
    await verifyContent(build.content);
  return build;
}
function receivedCodeNeedsContent(build, dataRoot) {
  if (!buildPresentOnDisk(build).ok)
    throw new Error("Received game is incomplete");
  const client = path.join(build.appPath, "Contents/Resources/client");
  const versions = realpathSync(path.join(dataRoot, "versions"));
  if (!realpathSync(client).startsWith(versions + path.sep))
    throw new Error("Code payload has the wrong root");
  const noLinks = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink())
        throw new Error("Code payload contains a symbolic link");
      if (entry.isDirectory()) noLinks(path.join(dir, entry.name));
    }
  };
  noLinks(client);
  const { treeSha256, provenance } = assertProvenanceMatches({
    clientDir: client,
    expectedRevision: build.revision,
    expectedDirty: false,
  });
  if (treeSha256 !== build.clientTreeSha256)
    throw new Error("Received code hash differs");
  if (build.content) {
    if (
      path.resolve(build.content.cacheRoot) !==
      path.resolve(dataRoot, "content")
    )
      throw new Error("Content cache has the wrong root");
    if (provenance.runtimeArtCapability !== CONTENT_CAPABILITY)
      throw new Error("This game does not support the received content");
    return true;
  }
  return false;
}
export function reconcileReceivedChannel(dataRoot, track) {
  const file = channelPath(dataRoot, track);
  if (!file || !existsSync(file)) return null;
  const channel = JSON.parse(
    readFileSync(
      containedFile(path.dirname(file), path.basename(file)),
      "utf8",
    ),
  );
  if (
    channel.schema !== CHANNEL_SCHEMA ||
    channel.track !== track ||
    channel.ready !== true
  )
    throw new Error("Received channel is not ready");
  const statePath = path.join(dataRoot, "state.json"),
    initial = readFileSync(statePath),
    state = cleanHubState(JSON.parse(initial));
  if (!state?.tracks[track])
    throw new Error("Received channel has no existing save track");
  if (state.tracks[track].pinned === true)
    return {
      outcome: "kept-local",
      revision: state.tracks[track].current.revision,
    };
  const current = state.tracks[track].current;
  if (
    channel.base &&
    (current.revision !== channel.base.revision ||
      current.clientTreeSha256 !== channel.base.clientTreeSha256 ||
      (current.content?.id ?? null) !== channel.base.contentId)
  )
    return { outcome: "superseded", revision: current.revision };
  const build = verifyReceivedBuild(channel.build, dataRoot);
  const same = (b) =>
    b?.revision === build.revision &&
    b.clientTreeSha256 === build.clientTreeSha256 &&
    (b.content?.id ?? null) === (build.content?.id ?? null);
  if (same(state.tracks[track].current))
    return { outcome: "up-to-date", revision: build.revision };
  if (same(state.tracks[track].pending))
    return { outcome: "pending", revision: build.revision };
  if (!readFileSync(statePath).equals(initial))
    throw new Error("Selection changed; retry receiving");
  const next = withPending(state, track, state.tracks[track].branch, build),
    temporary = statePath + ".received-" + process.pid;
  writeFileSync(temporary, JSON.stringify(next, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  renameSync(temporary, statePath);
  return { outcome: "pending", revision: build.revision };
}
export function publishReceivedChannel({ dataRoot, track, build, base }) {
  verifyReceivedBuild(build, dataRoot);
  const file = channelPath(dataRoot, track);
  if (!file) throw new Error("Private receiving cannot publish main");
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + ".next-" + process.pid;
  writeFileSync(
    temporary,
    JSON.stringify(
      {
        schema: CHANNEL_SCHEMA,
        track,
        ready: true,
        build,
        ...(base ? { base } : {}),
      },
      null,
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  renameSync(temporary, file);
  return file;
}
