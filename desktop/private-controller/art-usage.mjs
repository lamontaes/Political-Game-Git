import { loadContentManifest } from "../runtime-content.mjs";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { assertProvenanceMatches } from "../../scripts/client-provenance.mjs";

const verifiedTrees = new Map();
function treeStamp(root) {
  const entries = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else {
        const stat = statSync(file, { bigint: true });
        entries.push(`${file}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`);
      }
    }
  }
  visit(root);
  return entries.sort().join("\n");
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const labels = (value) =>
  Array.isArray(value) &&
  value.every((item) => typeof item === "string" && item.length <= 240);

/**
 * The Art Desk asks every few seconds, on the hub's main thread. The answer
 * only changes when the client tree (stamped by size and times), the content
 * snapshot or the legacy cache record changes, so it is computed once per
 * stamp and reused.
 */
const usageAnswers = new Map();
export function selectedArtUsage(build, cacheRoot) {
  if (!build?.clientTreeSha256) return null;
  const client = path.join(build.appPath, "Contents", "Resources", "client");
  let stamp;
  try {
    stamp = [
      treeStamp(client),
      build.revision,
      build.clientTreeSha256,
      build.content?.id ?? "",
      build.privatePack?.packId ?? "",
      build.privatePack?.manifestSha256 ?? "",
      recordStamp(path.join(cacheRoot, `${build.clientTreeSha256}.json`)),
      build.content && typeof build.content.cacheRoot === "string"
        ? recordStamp(
            path.join(
              build.content.cacheRoot,
              "snapshots",
              `${build.content.id}.json`,
            ),
          )
        : "",
    ].join("\n");
  } catch {
    stamp = null;
  }
  const key = `${client}:${cacheRoot}`;
  const known = stamp && usageAnswers.get(key);
  if (known && known.stamp === stamp) return known.answer;
  const answer = computeArtUsage(build, cacheRoot, client);
  if (stamp) usageAnswers.set(key, { stamp, answer });
  return answer;
}

function recordStamp(file) {
  try {
    const stat = statSync(file, { bigint: true });
    return `${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
  } catch {
    return "absent";
  }
}

/** A projection belongs to one immutable client, never merely to an asset name. */
function computeArtUsage(build, cacheRoot, client) {
  const selected = {
    revision: build.revision,
    clientTreeSha256: build.clientTreeSha256,
    packId: build.privatePack?.packId ?? null,
    packManifestSha256: build.privatePack?.manifestSha256 ?? null,
  };
  try {
    const stamp = treeStamp(client);
    const key = `${client}:${build.revision}:${build.clientTreeSha256}`;
    if (verifiedTrees.get(key) !== stamp) {
      const verified = assertProvenanceMatches({
        clientDir: client,
        expectedRevision: build.revision,
        expectedDirty: false,
      });
      if (verified.treeSha256 !== build.clientTreeSha256) return selected;
      verifiedTrees.set(key, stamp);
    }
  } catch {
    return selected;
  }
  if (build.content) {
    try {
      const loaded = loadContentManifest(build.content);
      const rules = JSON.parse(
        readFileSync(path.join(client, "runtime-art-consumers.json"), "utf8"),
      );
      if (
        rules.schema !== "ocd-runtime-consumers/v1" ||
        !Array.isArray(rules.consumers)
      )
        throw new Error("Missing consumer contract");
      const assets =
        loaded.manifest.metadata["art/manifest/asset_manifest.json"]?.assets ??
        [];
      const bindings = rules.consumers.flatMap((rule) => {
        const asset = assets.find((a) => a.asset_id === rule.assetId);
        const file = loaded.manifest.files.find(
          (f) => f.path === asset?.final_path && f.sha256 === asset.hash,
        );
        if (!file || !labels(rule.labels) || !labels(rule.eligible)) return [];
        return [
          {
            assetId: asset.asset_id,
            sourceSha256: file.sha256,
            derivativeSha256: file.sha256,
            derivativePath: `/__content/${build.content.id}/${file.sha256}`,
            useLabels: rule.labels,
            eligible: rule.eligible,
          },
        ];
      });
      return {
        ...selected,
        packId: "runtime-art",
        packManifestSha256: build.content.id,
        bindings,
      };
    } catch {
      return selected;
    }
  }
  let record;
  try {
    record = JSON.parse(
      readFileSync(path.join(client, "art-usage.json"), "utf8"),
    );
    if (
      record.schema !== "ocd-compiled-art-usage-v1" ||
      record.sourceRevision !== selected.revision
    )
      record = null;
  } catch {
    /* Older clients use a separately verified projection. */
  }
  if (!record) {
    try {
      record = JSON.parse(
        readFileSync(
          path.join(cacheRoot, `${selected.clientTreeSha256}.json`),
          "utf8",
        ),
      );
      if (
        record.schema !== "ocd-legacy-art-usage-v1" ||
        Object.entries(selected).some(([key, value]) => record[key] !== value)
      )
        record = null;
    } catch {
      /* Missing evidence means unknown, never unused. */
    }
  }
  if (!record || !Array.isArray(record.bindings)) return selected;
  try {
    const bindings = record.bindings.map((binding) => {
      if (
        !binding.assetId ||
        !sha(binding.sourceSha256) ||
        !sha(binding.derivativeSha256) ||
        !labels(binding.useLabels) ||
        !binding.useLabels.length ||
        !labels(binding.eligible) ||
        typeof binding.derivativePath !== "string" ||
        !/^assets\/[A-Za-z0-9._-]+$/.test(binding.derivativePath)
      )
        throw new Error("Invalid usage binding");
      if (
        hash(readFileSync(path.join(client, binding.derivativePath))) !==
        binding.derivativeSha256
      )
        throw new Error("Bundled artwork changed");
      return binding;
    });
    return { ...selected, bindings };
  } catch {
    return selected;
  }
}
