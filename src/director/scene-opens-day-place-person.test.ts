import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { storyScene } from "../bench/story";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { CoreState, PersonId } from "../core2/types";
import { dateSaid } from "../english/day-words";
import { composeScene } from "./scene";

// Owner, Nov 8: "If it's June 7th, it says first thing on June 7th. You head
// to the clerk's office and speak to Maria Patton. And then it starts like
// that." Every scene's first narration names the day (as people say it), the
// place it is set in and the person the player meets, in a played year of an
// ordinary generated world in a place drawn from all 56.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const place = drawPlace(seed, "scene-opens");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
const playerId = world.playerId! as PersonId;
director.watch(core, playerId);
core.focusPersonIds.add(playerId);

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
const where = `${place.name} (${place.key}), seed ${seed}`;

const PART_OF_DAY =
  /^(First thing on|Late in the morning on|Around noon on|On the afternoon of|Toward evening on|Late on) [A-Z][a-z]+ \d{1,2}(st|nd|rd|th)\b/;
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const MORNING = 8 * 60;

describe(`every scene opens on the day, the place and the person in ${where}`, () => {
  it("composeScene's first narration line names the day and the person, for each kind of setting", () => {
    const kinds = new Map<string, string>();
    let named = 0;
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(
          core,
          director,
          book.personId,
          entry,
          undefined,
          MORNING,
        )!;
        const first = scene.narration[0]!.text;
        const label = `${scene.setting.kind}/${scene.typeKey}: ${first}`;
        expect(scene.arrival, `${where}: ${label}`).toBeDefined();
        expect(first, label).toMatch(PART_OF_DAY);
        expect(first, label).toContain(dateSaid(core.date));
        expect(first, label).not.toMatch(ISO);
        expect(first, label).not.toMatch(
          /\{|\}|undefined|\b[a-z]+:[a-z0-9-]{6,}/,
        );
        if (scene.talkToId) {
          const person = core.people.get(scene.talkToId)!;
          if (scene.arrival?.usedFactKeys?.includes("name")) {
            named += 1;
            expect(first, label).toContain(
              `${person.givenName} ${person.familyName}`,
            );
          }
        }
        if (!kinds.has(scene.setting.kind))
          kinds.set(scene.setting.kind, first);
      }
    process.stderr.write(
      `${where}: openings by setting kind\n` +
        [...kinds].map(([kind, text]) => `  ${kind}: ${text}`).join("\n") +
        "\n",
    );
    expect(kinds.size, where).toBeGreaterThanOrEqual(2);
    expect(named, where).toBeGreaterThan(0);
  }, 600_000);

  it("the staged scene (with a purpose or without) opens on the day too", () => {
    let seen = 0;
    for (const book of director.ledger.people.values()) {
      if (book.personId !== playerId) continue;
      for (const entry of book.schedule) {
        if (!entry.bindings.length || seen >= 60) continue;
        const staged = storyScene(
          core,
          director,
          book.personId,
          entry.momentId,
          MORNING,
        );
        const lines = staged.narration.map((line) => line.text);
        if (!lines.length) continue;
        seen += 1;
        expect(lines[0], `${where}: ${lines.join(" ")}`).toMatch(PART_OF_DAY);
        expect(lines.join(" ")).not.toMatch(ISO);
      }
    }
    expect(seen, where).toBeGreaterThan(0);
  }, 600_000);
});
