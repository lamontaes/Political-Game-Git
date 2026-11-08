import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { TERM_MEASURES } from "../core2/term-read";
import { beginSpeech, chooseSpeechPart, speechText } from "./speech-builder";

// The player's speech is built from the world around them (owner, Nov 8: "I
// think it would be good to start with laws and effects and the world around
// you", and "the player's own speeches with clickable parts"). One world drawn
// from all 56 places on a seed the builder did not choose; the web's rows for
// its town are written the way the web writes them (rent climbing, health
// mending), and at the core of the speech one of the four choices is the
// town's worst or best area, with the remedy as a stand where the area has one.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "speech-world");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const web = coreAPI(core).moduleState(OUTCOME_WEB_MODULE_ID).table("months");

function writeTerm(change: Record<string, number>) {
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const factor = Object.entries(change).find(([prefix]) =>
        key.startsWith(prefix),
      )?.[1];
      values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
    }
    web.put({
      id: `web:${world.placeId}:${month}`,
      placeId: world.placeId,
      month,
      date: `${month}-02`,
      values,
      bases: values,
      effects: {},
      engineSources: {},
    } as never);
  }
}

describe("the player's speech starts from the world around them", () => {
  it("offers the town's worst area at the core, with the remedy as the stand it takes", () => {
    writeTerm({ "housing.rent": 0.4 });
    let build = beginSpeech(core, world.playerId!)!;
    build = chooseSpeechPart(core, build, build.choices[0]!.key);
    const world1 = build.choices.find((row) => row.subject === "area:rent");
    expect(world1, `${where}: no rent choice at the core`).toBeTruthy();
    expect(world1!.text, where).toMatch(/rent/);
    expect(world1!.stand?.desiredChange, where).toBe("enact");
    expect(world1!.sourceRecordIds.length, where).toBeGreaterThan(0);
    expect(
      world1!.sourceRecordIds.some((id) => id.startsWith("web:")),
      where,
    ).toBe(true);
    // Saying it puts the part in the speech.
    build = chooseSpeechPart(core, build, world1!.key);
    expect(speechText(build), where).toMatch(/rent/);
    process.stdout.write(`SPEECH WORLD ${where}\n  ${world1!.text}\n`);
  });

  it("offers good news as a thing worth saying, with no stand to take", () => {
    writeTerm({ "housing.rent": -0.4 });
    let build = beginSpeech(core, world.playerId!)!;
    build = chooseSpeechPart(core, build, build.choices[0]!.key);
    const good = build.choices.find((row) => row.subject === "area:rent");
    expect(good, where).toBeTruthy();
    expect(good!.stand, where).toBeUndefined();
    expect(good!.text, where).toMatch(/better|improved|getting better/);
  });
});
