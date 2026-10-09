/**
 * The opening-speech batch: the President's speech and its cut points from
 * new worlds in places drawn at random from all 56, for the owner to grade
 * before the cinematic opening merges (CTO 11:14 p.m., October 8, 2026).
 *
 *   node --import tsx scripts/dialogue-batch/address.ts --seed address-oct9 \
 *     --worlds 14 --out data/english/batches/address-1.json
 *
 * Every line is exactly what composePresidentialAddress returned for a
 * generated world. Nothing here writes or edits wording. One item is one
 * stretch of the speech, with the stop the camera cuts to while it plays.
 *
 * This is a development tool for reviewing wording. It is never part of play.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { drawRandomPlace } from "../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import {
  composePresidentialAddress,
  type AddressCut,
} from "../../src/presentation/presidential-address";

const CUT_SCREENS: Record<AddressCut, string> = {
  country: "the President at the rostrum",
  representatives: "the player's senators and representative in the chamber",
  state: "the player's governor",
  town: "the player's town hall or main street",
  home: "the player's family at home",
  you: "the player",
  "day-one": "day one",
};

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1]! : fallback;
}

const seed = arg("seed", "address-oct9");
const worlds = Number(arg("worlds", "14"));
const out = arg("out", "test-results/dialogue-batch/address.json");
const head = execSync("git rev-parse HEAD").toString().trim();

const items: Record<string, unknown>[] = [];
const speeches: Record<string, unknown>[] = [];
const statesUsed = new Set<string>();
for (let index = 0; index < worlds; index += 1) {
  const worldSeed = `${seed}:${index}`;
  // One world per state or territory, so the batch covers as many as it can.
  const place = drawRandomPlace(
    worldSeed,
    (candidate) => !statesUsed.has(candidate.stateJurisdictionKey ?? ""),
  );
  statesUsed.add(place.stateJurisdictionKey ?? "");
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: worldSeed,
      placeKey: place.key,
      startAge: 34,
      questionnaire: "skipped",
    }),
  ).game!;
  const address = composePresidentialAddress(game.world);
  if (!address) {
    console.log(`${worldSeed} ${place.displayName}: no President on record`);
    continue;
  }
  speeches.push({
    seed: worldSeed,
    place: place.displayName,
    register: address.register,
    president: address.speakerName,
    date: address.deliveredOn,
    cuts: address.segments.map((segment) => ({
      cut: segment.cut,
      text: segment.lines.map((line) => line.text).join(" "),
    })),
  });
  for (const segment of address.segments) {
    for (const line of segment.lines) {
      items.push({
        i: items.length,
        id: `address-${index}-${segment.cut}-${line.part.split(".").at(-1)}`,
        axis: "speech",
        situation: `The opening's speech (${address.register === "inaugural" ? "inaugural address" : "State of the Union"}) by the President, ${address.speakerName}, in a new world on ${address.deliveredOn}; the player lives in ${place.displayName}. While this plays, the camera is on ${CUT_SCREENS[segment.cut]}.`,
        prior: "",
        reply: line.text,
        part: line.part,
        parts: [line.part],
        composer: "composePresidentialAddress in presidential-address.ts",
        kind: "speech",
        screen: `Opening, letterbox subtitles, cut to ${CUT_SCREENS[segment.cut]}`,
        place: place.displayName,
        seed: worldSeed,
      });
    }
  }
  console.log(`${worldSeed} ${place.displayName} ${address.register}`);
}

const batch = {
  id: "address-1",
  title: `The opening's speech from ${speeches.length} new worlds (${items.length} lines)`,
  at: new Date().toISOString(),
  head,
  status: "open",
  variety: {
    items: items.length,
    worlds: speeches.length,
    places: speeches.length,
  },
  speeches,
  items,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(batch, null, 2)}\n`);
console.log(`${speeches.length} speeches, ${items.length} lines → ${out}`);
