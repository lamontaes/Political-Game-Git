/**
 * The one speech outline's proof (words composer, unit 3): in drawn places it
 * composes the President's opening address and the governor's and mayor's
 * addresses through the one planner, prints them as played, and reports what
 * each outline chose (theme, asks) so a reader sees why.
 *
 *   OCD_STORAGE_OVERRIDE=... node --import tsx scripts/words/speech-outline-proof.ts [seed ...]
 *
 * With no seed it runs the labeled grading seed (Wofford Heights, California)
 * and two fresh draws.
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { placeLocalities } from "../../src/core2/places";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { composeLocalAddress } from "../../src/director/local-address";

setBookkeeping(false);
const LABELED = "a9c85de3-e7fa-4418-8499-569a5c5e6e10";

function labeledPlace(): { seed: string; key: string; name: string } {
  const row = [...placeLocalities("US-CA")].find(
    (entry) => entry.formalName === "Wofford Heights",
  );
  if (!row) throw new Error("Wofford Heights is not in the corpus");
  return { seed: LABELED, key: row.key, name: "Wofford Heights, California" };
}

const seeds = process.argv.slice(2);
const places = seeds.length
  ? seeds.map((seed) => {
      const drawn = drawPlace(seed, "speech-outline");
      return {
        seed: drawn.seed,
        key: drawn.key,
        name: drawn.name,
        label: seed,
      };
    })
  : [
      { ...labeledPlace(), label: LABELED },
      ...[0, 1].map(() => {
        const label = randomBytes(8).toString("hex");
        const drawn = drawPlace(label, "speech-outline");
        return { seed: drawn.seed, key: drawn.key, name: drawn.name, label };
      }),
    ];

for (const place of places) {
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const head = `${place.name} (${place.key}), seed ${place.label}`;
  const opening = world.director.ledger.opening;
  console.log(`\n### ${head}\n`);
  console.log(
    `**The President's ${opening?.speechKind ?? "address"}** (theme: ${opening?.theme ?? "none"}; asks: ${(opening?.asks ?? []).join(", ") || "none"})\n`,
  );
  for (const part of opening?.address.parts ?? []) console.log(`> ${part}\n>`);
  for (const level of ["state", "town"] as const) {
    const local = composeLocalAddress(world.core, level);
    console.log(
      `\n**The ${level === "state" ? "governor's" : "mayor's"} address** (theme: ${local?.theme ?? "none"}; asks: ${(local?.asks ?? []).join(", ") || "none"})\n`,
    );
    if (!local) console.log("> (no one seated to give it)");
    for (const part of local?.parts ?? []) console.log(`> ${part}\n>`);
  }
}
