/**
 * Moves before the start, run by the moves engine's rule (history-past-moves;
 * owner, Oct 28, 2026: "simulate to the birth year"), in the played world: a
 * place drawn from all 56, the bench's full build, a 60-year-old player.
 * Every move into the county is a dated record naming where the person came
 * from, the record that says so and the month that carried them; the Journal
 * tells it; the working life before it ran in the place they came from; and
 * a second seed in the same place gives other moves.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { composeJournal } from "../director/journal";
import { gameStartDate } from "./game-start";
import { PAST_WORK_SPELL, PERSON_MOVED_IN, pastWorkOf } from "./past-module";
import { preStartHistory } from "./pre-start";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const start = gameStartDate();
const build = (worldSeed: string, key: string) =>
  buildBenchWorld(worldSeed, start, {
    twoLevel: true,
    placeKey: key,
    // A 60-year-old player: the run starts in their birth year.
    playerBirthDate: `${Number(start.slice(0, 4)) - 60}-06-15`,
  });

// Places are drawn until one holds a move inside the run (a town whose
// opening circle has someone whose family lives elsewhere: about one drawn
// world in three), then a named regression place that holds one (Burket,
// Indiana, seed of the draw "m4"), so a build is never left without a case.
const passed: string[] = [];
let found:
  | { place: ReturnType<typeof drawPlace>; world: ReturnType<typeof build> }
  | undefined;
const candidates = [
  ...[0, 1, 2, 3].map((draw) =>
    drawPlace(`${seed}:${draw}`, "history-past-moves"),
  ),
  drawPlace("m4", "history-past-moves"),
];
for (const place of candidates) {
  const world = build(place.seed, place.key);
  if (preStartHistory(world.core, { kind: PERSON_MOVED_IN }).length) {
    found = { place, world };
    break;
  }
  passed.push(`${place.name} (${place.key})`);
}
if (!found)
  throw new Error(`No place held a move in the run: ${passed.join("; ")}`);
const { place, world } = found;
const { core, director } = world;
const label = `${place.name} (${place.key}), seed ${place.seed}; passed over: ${passed.join("; ") || "none"}`;
const moves = preStartHistory(core, { kind: PERSON_MOVED_IN });

describe(`moves before the start, ${label}`, () => {
  it("records each move with where they came from, the record that says so and the month that carried them", () => {
    expect(moves.length, label).toBeGreaterThan(0);
    const months = preStartHistory(core, { kind: "economy.conditions" });
    const ids = new Set(months.map((row) => row.id));
    for (const row of moves) {
      const mover = core.people.get(row.facts.personId as PersonId)!;
      expect(row.facts.fromPlaceId, row.id).not.toBe(mover.placeId);
      expect(row.facts.toPlaceId, row.id).toBe(mover.placeId);
      expect(
        (mover.pastFacts ?? []).some(
          (fact) => fact.id === row.facts.originRecordId,
        ),
        `${row.id}: ${row.facts.originRecordId}`,
      ).toBe(true);
      // The economy pass's month in force that day; before its first month
      // (its series starts in 1989), the life-stage month itself.
      const inForce = months.some((month) => month.date <= row.date);
      expect(
        inForce
          ? ids.has(String(row.facts.pushedBy))
          : String(row.facts.pushedBy) ===
              `life-stage:${row.date.slice(0, "YYYY-MM".length)}`,
        `${row.id}: ${row.facts.pushedBy}`,
      ).toBe(true);
      expect(row.date < core.startedAt, row.id).toBe(true);
    }
  });

  it("runs the working life before the move where they lived then", () => {
    let checked = 0;
    for (const row of moves) {
      const id = row.facts.personId as PersonId;
      for (const spell of pastWorkOf(core, id)) {
        if (spell.kind !== PAST_WORK_SPELL) continue;
        const startedAt = String(spell.facts.startedAt);
        if (startedAt >= row.date || spell.facts.end === "held-at-start")
          continue;
        checked += 1;
        expect(spell.placeId, spell.id).toBe(row.facts.fromPlaceId);
        // The world keeps no employers where they came from.
        expect(spell.facts.organizationId, spell.id).toBeUndefined();
      }
    }
    console.log(
      `MOVES ${label}: ${moves.length} moves, ${checked} spells before a move`,
    );
  });

  it("is told in the Journal from its record", () => {
    const row = moves[0]!;
    const id = row.facts.personId as PersonId;
    director.watch(core, id);
    const lines = composeJournal(core, director, id).flatMap(
      (chapter) => chapter.lines,
    );
    const line = lines.find((entry) => entry.sourceRecordIds.includes(row.id));
    expect(line, `${label}: ${row.id}`).toBeDefined();
    expect(line!.text, row.id).toMatch(/moved|came/i);
    console.log(`MOVE LINE ${label}: "${line!.text}" (${row.id})`);
  });

  it("gives other moves with a second seed in the same place", () => {
    const other = build(`${place.seed}:second`, place.key);
    const key = (rows: typeof moves) =>
      rows
        .map((row) => `${row.facts.personId}@${row.date}`)
        .sort()
        .join(" ");
    expect(
      key(preStartHistory(other.core, { kind: PERSON_MOVED_IN })),
      label,
    ).not.toBe(key(moves));
  }, 600_000);
});
