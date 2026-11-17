import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";

import type { CoreState, PersonId } from "../core2/types";
import { composeScene } from "./scene";
import { SCENE_WORDS } from "../english/scene-words";

// Owner, Oct 15 evening: the narrator sets the scene in a few sentences. The
// sentence about what is happening comes from the staged situation's type,
// drawn from the English engine's parts and the scene's own records. In a
// played year of the played world (every module), in a place drawn from all
// 56: a world of the director alone records nothing after day one and
// staged no scene in a year in Apollo Beach, Florida (seed
// 7e3354349508f0c3f5018245adc81bdebc1b33348a95b76dfe48c50e4d594d51), and
// six weeks of the played world stage little but the address, which a
// speech heard tells in its speaker's words with no lead. The year is played
// as the bench plays it: the player controlled, each day lived on their own
// choice, so the scenes from circumstance come as they do in play (a world
// advanced without a controlled player staged one scene in a year in Koloa,
// Hawaii, seed 816b34a523d1dc96346e: the player's senior year ended without
// a diploma and no circumstance could fire).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const place = drawPlace(seed, "scene-leads");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
// The bench's director watches the player once the player is chosen.
const playerId = world.playerId! as PersonId;
director.watch(core, playerId);
core.focusPersonIds.add(playerId);

/** Plays the player's days as the bench does, through the given number of days. */
function play(state: CoreState, days: number): void {
  let packet = advancePlayerV1(state, {
    controlledPersonId: playerId,
    through: {
      date: addDays(makeIsoDate(state.date), days),
      minuteOfDay: P.zero,
    },
  });
  while (packet.kind !== "complete")
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(state, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(state, {
            kind: "own-choice",
            pauseId: packet.pauseId,
          });
}
play(core, 365);
const withoutLeads = { ...SCENE_WORDS, leads: [] };
const where = `${place.name} (${place.key}), seed ${seed}`;

describe(`situation leads in ${where}`, () => {
  it("adds a sentence for each staged scene whose type has one, citing records", () => {
    let withLead = 0;
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry)!;
        const plain = composeScene(
          core,
          director,
          book.personId,
          entry,
          withoutLeads,
        )!;
        const text = scene.narration.map((line) => line.text).join(" ");
        const before = plain.narration.map((line) => line.text).join(" ");
        const has = SCENE_WORDS.leads.some(
          (row) => row.typeKey === scene.typeKey && row.variants.length,
        );
        if (text === before) continue;
        withLead += 1;
        expect(has, `${where}: ${scene.momentId}`).toBe(true);
        expect(text, scene.momentId).not.toMatch(/\{\{|\}\}|undefined/);
        expect(text, scene.momentId).not.toMatch(/\b(I|my|me)\b/);
        expect(
          scene.narration.flatMap((line) => line.sourceRecordIds).length,
        ).toBeGreaterThan(0);
      }
    // A year-old-world's scenes include at least one with a situation lead.
    expect(withLead, where).toBeGreaterThan(0);
  }, 600_000);
});
