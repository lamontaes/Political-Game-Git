import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { applyCoreEvent } from "../core2/state";
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
// speech heard tells in its speaker's words with no lead.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const place = drawPlace(seed, "scene-leads");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
// The bench's director watches the player once the player is chosen.
director.watch(core, world.playerId!);
advanceCore(core, addDays(makeIsoDate(core.date), 365));
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

  it("sets a funeral: who has come to say goodbye, never the person who died", () => {
    const watched = [...director.ledger.people.keys()]
      .map((id) => core.people.get(id)!)
      .find((row) => row.alive && [...row.knownIds].length > 2)!;
    const dead = [...watched.knownIds]
      .map((id) => core.people.get(id)!)
      .find((row) => row.alive && row.tier !== "husk")!;
    applyCoreEvent(core, {
      id: `life.death:${dead.id}:${core.date}`,
      date: core.date,
      kind: "life.death",
      personIds: [dead.id],
      witnessIds: [watched.id],
      placeId: watched.placeId,
      publicRecord: true,
      moodImpulse: -1,
      stressImpulse: 1,
      source: {
        tag: "SOURCED",
        citation: "A death as the health writer records it.",
        asOf: core.date,
      },
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 5));
    const funeral = director.ledger.people
      .get(watched.id)!
      .schedule.filter((row) =>
        row.bindings.some((bound) => bound.typeKey === "funeral"),
      )
      // The funeral's own scene: a death a housemate shares is first told at
      // home (news-arrives), and the funeral follows it, as the bench orders
      // a moment's scenes.
      .map((row) =>
        composeScene(core, director, watched.id, {
          ...row,
          bindings: [
            ...row.bindings.filter((bound) => bound.typeKey === "funeral"),
            ...row.bindings.filter((bound) => bound.typeKey !== "funeral"),
          ],
        })!,
      );
    expect(funeral.length, where).toBeGreaterThan(0);
    for (const scene of funeral) {
      const text = scene.narration.map((line) => line.text).join(" ");
      expect(text, where).toMatch(/goodbye/);
      // The sentence about the gathering never names the one who died.
      const gathering = text
        .split(/(?<=[.!?])\s/)
        .find((row) => /goodbye/.test(row))!;
      expect(gathering, where).not.toContain(dead.givenName);
    }
  }, 600_000);
});
