/**
 * Every one of the 56 places has a map pack (pool item
 * play-territory-map-geometry): the 50 states and D.C. from the Census
 * cartographic boundary files, and the five territories compiled from the same
 * files at the same vintage. Each pack names its source files by hash, and the
 * hashes are the locked ones. A drawn territory's town loads its map in the
 * bench world.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { placeLocalities } from "../core2/places";
import { buildBenchWorld } from "./world";
import { governmentMap } from "./map";

const GEOMETRY = new URL("../maps/geometry/states/", import.meta.url);
/** Every locked source file by id: the boundary files and the 2026 district-line files the packs are drawn from. */
function lockedArtifacts(): Map<string, string> {
  const found = new Map<string, string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      const row = value as Record<string, unknown>;
      if (typeof row.artifactId === "string" && typeof row.sha256 === "string")
        found.set(row.artifactId, row.sha256);
      Object.values(row).forEach(walk);
    }
  };
  for (const path of [
    "../../data/source/map-geometry/artifact-lock.json",
    "../../data/research/district-lines-2026/artifact-lock.json",
  ])
    walk(JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")));
  return found;
}
const LOCKED = lockedArtifacts();
const VINTAGE = "census-cb-2025";

interface Pack {
  format: string;
  vintage: string;
  bbox: number[];
  arcs: number[][];
  layers: Record<
    string,
    { geoid: string; name: string; stateUsps: string; rings: number[][] }[]
  >;
  sources: { artifactId: string; sha256: string }[];
}

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const TERRITORIES = ["AS", "GU", "MP", "PR", "VI"];

it("each of the 56 places has a map pack with its outline, drawn from the locked source files", () => {
  const files = readdirSync(GEOMETRY);
  const places = corePlaceStateIdentities();
  expect(places.length).toBe(56);
  for (const { usps } of places) {
    const file = files.find((name) =>
      name.endsWith(`-${usps.toLowerCase()}.generated.json`),
    );
    expect(file, `a map pack for ${usps}`).toBeDefined();
    const pack = JSON.parse(
      readFileSync(new URL(file!, GEOMETRY), "utf8"),
    ) as Pack;
    expect(pack.format, usps).toBe("ocd-map-geometry/v1");
    expect(pack.vintage, usps).toBe(VINTAGE);
    const outline = pack.layers.state ?? [];
    expect(outline.length, `${usps} outline`).toBe(1);
    expect(outline[0]!.stateUsps, usps).toBe(usps);
    expect(outline[0]!.geoid, usps).toBe(file!.slice(0, 2));
    expect(pack.bbox.every(Number.isFinite), `${usps} bbox`).toBe(true);
    expect(
      pack.bbox[2]! > pack.bbox[0]! && pack.bbox[3]! > pack.bbox[1]!,
      usps,
    ).toBe(true);
    // Every ring refers to an arc the pack holds.
    for (const layer of Object.values(pack.layers))
      for (const feature of layer)
        for (const ring of feature.rings)
          for (const ref of ring)
            expect(
              pack.arcs[ref < 0 ? ~ref : ref],
              `${usps} ${feature.geoid}`,
            ).toBeDefined();
    // Lineage: each source is a locked artifact with its locked hash.
    expect(pack.sources.length, `${usps} sources`).toBeGreaterThan(0);
    for (const source of pack.sources)
      expect(
        LOCKED.get(source.artifactId),
        `${usps} ${source.artifactId}`,
      ).toBe(source.sha256);
  }
}, 120_000);

it("a drawn territory's town loads its map with the outline and its county equivalents", () => {
  const pick =
    TERRITORIES[
      parseInt(
        createHash("sha256").update(seed).digest("hex").slice(0, 8),
        16,
      ) % TERRITORIES.length
    ]!;
  // A town in the drawn territory, by the same hash the other draws use.
  const hash = createHash("sha256")
    .update(`${seed}:map-pack-${pick}`)
    .digest("hex");
  const towns = [...placeLocalities(`US-${pick}`)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  const place = {
    seed: hash,
    ...towns[parseInt(hash.slice(8, 16), 16) % towns.length]!,
  };
  const where = `${pick}: seed ${place.seed}, ${place.name} (${place.key})`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const map = governmentMap(core);
  expect(map, where).not.toBeNull();
  expect(map!.state?.name, where).toBeTruthy();
  expect(map!.state?.d.length, where).toBeGreaterThan(0);
  expect(map!.counties.length, where).toBeGreaterThan(0);
  console.log(
    `MAP ${where}: ${map!.state!.name}, ${map!.counties.length} county equivalents`,
  );
}, 900_000);

it("the manifest names each territory pack by its size and hash", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../../data/source/map-geometry/manifest.json", import.meta.url),
      "utf8",
    ),
  ) as {
    packs: { packId: string; path: string; bytes: number; sha256: string }[];
  };
  for (const usps of TERRITORIES) {
    const file = readdirSync(GEOMETRY).find((name) =>
      name.endsWith(`-${usps.toLowerCase()}.generated.json`),
    )!;
    const text = readFileSync(new URL(file, GEOMETRY));
    const entry = manifest.packs.find((pack) => pack.path.endsWith(`/${file}`));
    expect(entry, `${usps} is in the manifest`).toBeDefined();
    expect(entry!.bytes, usps).toBe(text.length);
    expect(entry!.sha256, usps).toBe(
      createHash("sha256").update(text).digest("hex"),
    );
  }
});
