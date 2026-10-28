/* global process, console */
// Proof that a scene's picture comes from its whole family, by town: builds
// played worlds in random places (all 56, named with place and seed), and for
// each reports the street scene at three hours and every business whose
// picture is in a family, by organization record id and backdrop file.
// Usage: node --import tsx scripts/people/backdrop-proof.ts <out.json> [seed ...]
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { backdropFile, orgPlace, pictureFor } from "../../src/bench/scene";
import { drawPlace } from "../../tests/golden-path/place";
import scenePlaces from "../../src/bench/data/scene-places.json" with { type: "json" };

const [out = "backdrop-proof.json", ...given] = process.argv.slice(2);
const seeds = given.length
  ? given
  : [0, 1, 2].map(() => randomBytes(6).toString("hex"));
const inFamily = new Set(scenePlaces.pictureFamilies.families.flat());
const towns = seeds.map((seed) => {
  const place = drawPlace(seed, "backdrop-proof");
  const { core } = buildBenchWorld(seed, "2026-10-13", {
    twoLevel: true,
    placeKey: place.key,
  });
  const street = [8, 12, 0].map((hour) => {
    const picture = pictureFor(core, "main-street", "public", hour * 60);
    return {
      hour,
      place: picture,
      file: backdropFile(picture, hour * 60).file,
    };
  });
  const businesses = [...core.organizations.values()]
    .map((org) => ({ id: org.id, place: orgPlace(core, org.id) }))
    .filter((row) => row.place && inFamily.has(row.place))
    .map((row) => ({ ...row, file: backdropFile(row.place!, 12 * 60).file }));
  return {
    name: `${place.name}, ${place.state}`,
    key: place.key,
    seed,
    street,
    businesses,
  };
});
writeFileSync(out, JSON.stringify(towns, null, 2) + "\n");
for (const town of towns) {
  console.log(`${town.name} (${town.key}), seed ${town.seed}`);
  for (const row of town.street)
    console.log(`  street at ${row.hour}:00 -> ${row.file}`);
  const counts = new Map<string, number>();
  for (const row of town.businesses)
    counts.set(row.place!, (counts.get(row.place!) ?? 0) + 1);
  console.log(
    `  businesses in a family: ${town.businesses.length}; pictures ${[...counts].map(([k, v]) => `${k} x${v}`).join(", ")}`,
  );
}
