import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  artDemand,
  readOutfitSpecs,
  type DemandCell,
  type DemandPack,
  type DemandStaging,
} from "../../scripts/appearance/art-demand";
import {
  posedPieces,
  type BodyPose,
  type BodyView,
  type PeoplePackManifest,
} from "./appearance-engine/pack";

interface Entry {
  id: string;
  place: string;
  spot: string;
}
interface AllowList {
  schema: "ocd-art-coverage-allow-list/v1";
  sources: { path: string; sha256: string }[];
  groups: { place: string; spot: string; ids: string[] }[];
}
const root = resolve(import.meta.dirname, "../..");
const packRoot = resolve(
  process.env.PEOPLE_PACK_ROOT ?? join(root, "art/people-engine/v1"),
);
const listPath = join(root, "art/coverage/allow-list.json");
const manifestText = readFileSync(join(packRoot, "manifest.json"), "utf8");
const pack = JSON.parse(manifestText) as PeoplePackManifest;
const stagingText = readFileSync(
  join(root, "art/backdrops/staging.json"),
  "utf8",
);
const builderText = readFileSync(
  join(root, "scripts/appearance/build-people-pack.ts"),
  "utf8",
);
const cells = artDemand(
  JSON.parse(stagingText) as DemandStaging,
  pack as unknown as DemandPack,
  readOutfitSpecs(builderText),
).cells;
const identity = (cell: DemandCell) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        cell.place,
        cell.spot,
        cell.pose,
        cell.view,
        cell.presentation,
        cell.build,
        cell.outfit,
      ]),
    )
    .digest("hex");
const nativeFiles = new Map<string, boolean>();
const checkedHeads = new Map<string, boolean>();
const { PNG } = createRequire(import.meta.url)("pngjs") as {
  PNG: { sync: { read(bytes: Buffer): { width: number; height: number } } };
};
function available(file: string): boolean {
  const cached = nativeFiles.get(file);
  if (cached !== undefined) return cached;
  const path = join(packRoot, file);
  let valid = false;
  if (existsSync(path)) {
    try {
      const image = PNG.sync.read(readFileSync(path));
      valid =
        image.width === pack.canvas.width &&
        image.height === pack.canvas.height;
    } catch {
      valid = false;
    }
  }
  nativeFiles.set(file, valid);
  return valid;
}

function uncovered(cell: DemandCell): string | null {
  const presentation = pack.presentations[cell.presentation];
  const face = presentation.faces[0];
  const hair = presentation.hair[0];
  if (!face || !hair) return "missing native face or hair";
  const resolved = posedPieces(
    presentation,
    {
      presentation: cell.presentation,
      build: cell.build as "lean" | "average" | "fuller",
      shade: 4,
      face: face.id,
      hair: hair.id,
      hairColor: "natural",
      outfit: cell.outfit,
      // Unsupported requested poses/views remain failures; these casts add no art.
      pose: cell.pose as BodyPose,
      view: cell.view as BodyView,
    },
    available,
  );
  if (resolved.pose !== cell.pose || resolved.view !== cell.view)
    return `fallback ${resolved.pose}/${resolved.view}`;
  const headKey = `${cell.presentation}/${cell.view}`;
  let heads = checkedHeads.get(headKey);
  if (heads === undefined) {
    const native =
      cell.view === "front"
        ? presentation
        : presentation.views?.[cell.view as "three-quarter"];
    heads = Boolean(
      native &&
      presentation.faces.every((face) => {
        const layer = native.faces.find((entry) => entry.id === face.id);
        return layer && available(layer.file);
      }) &&
      presentation.hair.every((hair) => {
        const layer = native.hair.find((entry) => entry.id === hair.id);
        return layer && available(layer.front) && available(layer.back);
      }),
    );
    checkedHeads.set(headKey, heads);
  }
  if (!heads) return "incomplete native face/hair style coverage";
  const slot =
    cell.pose === "standing"
      ? "stand"
      : cell.pose === "seated"
        ? "sit"
        : cell.pose;
  if (
    !pack.slotKindsByPose?.[resolved.pose]?.includes(
      slot as "stand" | "sit" | "podium" | "lean",
    )
  )
    return "unsupported slot pose";
  const outfit = resolved.outfit;
  if (!outfit) return "missing native outfit";
  const files = [
    resolved.body.file,
    resolved.face.file,
    resolved.hair.front,
    resolved.hair.back,
    outfit.file,
    outfit.hides,
    ...Object.values(outfit.regions ?? {}),
    ...(outfit.skin ? [outfit.skin] : []),
  ];
  if (!files.every(available)) return "missing or non-native PNG input";
  const declared = presentation.outfits.find(
    (entry) => entry.id === cell.outfit,
  );
  if (
    !declared ||
    Object.keys(declared.parts).some((part) => !outfit.regions?.[part])
  )
    return "missing garment mask";
  return null;
}
const failures = cells.flatMap((cell) => {
  const reason = uncovered(cell);
  return reason ? [{ ...cell, id: identity(cell), reason }] : [];
});
const entries = (list: AllowList): Entry[] =>
  list.groups.flatMap((group) =>
    group.ids.map((id) => ({ id, place: group.place, spot: group.spot })),
  );
function issues(
  actual: readonly Entry[],
  allowed: readonly Entry[],
  previous?: readonly Entry[],
) {
  const current = new Map(actual.map((entry) => [entry.id, entry]));
  const known = new Set(allowed.map((entry) => entry.id));
  const prior = previous ? new Set(previous.map((entry) => entry.id)) : null;
  return {
    newFailures: actual.filter((entry) => !known.has(entry.id)),
    stale: allowed.filter((entry) => !current.has(entry.id)),
    growth: prior ? allowed.filter((entry) => !prior.has(entry.id)) : [],
    misplaced: allowed.filter((entry) => {
      const match = current.get(entry.id);
      return (
        match && (match.place !== entry.place || match.spot !== entry.spot)
      );
    }),
  };
}

if (process.env.SEED_ART_COVERAGE === "1") {
  if (existsSync(listPath))
    throw new Error(
      "Coverage allow-list already exists; seed mode may not grow or replace it",
    );
  const groups = new Map<
    string,
    { place: string; spot: string; ids: string[] }
  >();
  for (const failure of failures) {
    const key = `${failure.place}\0${failure.spot}`;
    const group = groups.get(key) ?? {
      place: failure.place,
      spot: failure.spot,
      ids: [],
    };
    group.ids.push(failure.id);
    groups.set(key, group);
  }
  const list: AllowList = {
    schema: "ocd-art-coverage-allow-list/v1",
    sources: [
      { path: join(packRoot, "manifest.json"), text: manifestText },
      { path: "art/backdrops/staging.json", text: stagingText },
      { path: "scripts/appearance/build-people-pack.ts", text: builderText },
    ].map(({ path, text }) => ({
      path,
      sha256: createHash("sha256").update(text).digest("hex"),
    })),
    groups: [...groups.values()].map((group) => ({
      ...group,
      ids: group.ids.sort(),
    })),
  };
  mkdirSync(join(root, "art/coverage"), { recursive: true });
  writeFileSync(listPath, `${JSON.stringify(list, null, 2)}\n`);
}

describe("real native people-pack coverage", () => {
  it("covers every staged cell or records today's remaining debt", () => {
    const list = JSON.parse(readFileSync(listPath, "utf8")) as AllowList;
    expect(list.schema).toBe("ocd-art-coverage-allow-list/v1");
    const allowed = entries(list);
    expect(new Set(allowed.map((entry) => entry.id)).size).toBe(allowed.length);
    expect(allowed.every((entry) => /^[a-f0-9]{64}$/.test(entry.id))).toBe(
      true,
    );
    const baselineRef = spawnSync(
      "git",
      ["rev-parse", "--verify", "origin/main"],
      { cwd: root, encoding: "utf8" },
    );
    expect(
      baselineRef.status,
      "Fetch origin/main to verify the shrink-only baseline",
    ).toBe(0);
    const baseline = spawnSync(
      "git",
      ["show", "origin/main:art/coverage/allow-list.json"],
      { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
    );
    let previous: Entry[] | undefined;
    if (baseline.status === 0)
      previous = entries(JSON.parse(baseline.stdout) as AllowList);
    else
      expect(baseline.stderr).toMatch(
        /path 'art\/coverage\/allow-list.json' (?:does not exist|exists on disk, but not in)/,
      );
    const result = issues(failures, allowed, previous);
    process.stdout.write(
      `Native coverage: ${cells.length} cells, ${cells.length - failures.length} covered, ${failures.length} remaining; ${nativeFiles.size} PNG inputs checked.\n`,
    );
    expect(result.newFailures, "New uncovered cells by place and spot").toEqual(
      [],
    );
    expect(
      result.stale,
      "Remove now-covered or retired allow-list cells",
    ).toEqual([]);
    expect(
      result.growth,
      "The allow-list may only shrink relative to main",
    ).toEqual([]);
    expect(
      result.misplaced,
      "Allow-list provenance must match its place and spot",
    ).toEqual([]);
    expect(cells.length - failures.length).toBeGreaterThan(0);
  });

  it("fails for a new uncovered spot even when existing debt is listed", () => {
    const old = { id: "old", place: "fixture", spot: "old" };
    const fresh = { id: "fresh", place: "fixture", spot: "new" };
    expect(issues([old, fresh], [old]).newFailures).toEqual([fresh]);
  });

  it("requires removal when an allow-list entry becomes covered", () => {
    const covered = { id: "covered", place: "fixture", spot: "covered" };
    expect(issues([], [covered]).stale).toEqual([covered]);
    expect(issues([], [], [covered])).toEqual({
      newFailures: [],
      stale: [],
      growth: [],
      misplaced: [],
    });
  });

  it("rejects growth even when someone adds the new failure to the list", () => {
    const old = { id: "old", place: "fixture", spot: "old" };
    const fresh = { id: "fresh", place: "fixture", spot: "new" };
    expect(issues([old, fresh], [old, fresh], [old]).growth).toEqual([fresh]);
  });
});
