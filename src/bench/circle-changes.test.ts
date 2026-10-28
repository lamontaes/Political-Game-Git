/**
 * The People web marks who joined the player's five closest this year and who
 * left it, each with the record that changed the tie: the tie's own change,
 * a move away or a death. With no change it says so. A place is drawn from
 * all 56 and played a year; set GOLDEN_PATH_SEED to reproduce.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { currentCloseness } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { CoreState, Relationship } from "../core2/types";
import { personCard } from "./card";
import { circleChanges } from "./circle";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

const tiesOf = (core: CoreState, personId: string) =>
  [...(core.relationshipsByPerson.get(personId) ?? [])]
    .map((id) => core.relationships.get(id))
    .filter((row): row is Relationship => row !== undefined);
const otherOf = (row: Relationship, personId: string) =>
  row.actorId === personId ? row.otherId : row.actorId;

it(`the People web marks who joined and who left the five closest, each by its record (seed ${seed})`, () => {
  const place = drawPlace(seed, "circle-changes");
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const playerId = world.playerId!;
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  advanceCore(core, addDays(gameStartDate(), 365));

  // The played year, as it is: the card's five closest are the five ties
  // closest today by their records, and every mark stands on a record.
  const { circle } = personCard(core, playerId);
  const ranked = tiesOf(core, playerId)
    .map((row) => ({
      id: otherOf(row, playerId),
      level: currentCloseness(core, row),
    }))
    .filter((row) => row.level > 0)
    .sort((a, b) => b.level - a.level || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map((row) => row.id);
  expect(circle.closest, where).toEqual(ranked);
  const ties = new Set(
    tiesOf(core, playerId).map((row) => otherOf(row, playerId)),
  );
  for (const c of [...circle.joined, ...circle.left]) {
    const at = `${where}: ${c.name} (${c.personId}), ${c.cause} ${c.recordId}`;
    expect(ties.has(c.personId), at).toBe(true);
    expect(c.date >= circle.since, at).toBe(true);
    const record = core.durableLog.get(c.recordId);
    expect(Boolean(record || core.relationships.has(c.recordId)), at).toBe(
      true,
    );
    if (c.cause === "person.moved-away" || c.cause === "life.death")
      expect(record?.personIds, at).toContain(c.personId);
  }
  for (const c of circle.joined)
    expect(circle.closest, where).toContain(c.personId);
  for (const c of circle.left)
    expect(circle.closest, where).not.toContain(c.personId);
  process.stdout.write(
    `CIRCLE ${where}, ${playerId}: five closest ${circle.closest.join(", ")}; closer ${circle.joined.map((c) => `${c.name} (${c.cause} ${c.recordId})`).join("; ") || "none"}; drifted ${circle.left.map((c) => `${c.name} (${c.cause} ${c.recordId})`).join("; ") || "none"}\n`,
  );

  // An edge case on the same records: a tie outside the five that this year's
  // time together brought close (its record's latest change, from where it
  // stood to near-full closeness) joins, and the fifth closest leaves for
  // lack of time together.
  const outside = tiesOf(core, playerId)
    .filter((row) => !circle.closest.includes(otherOf(row, playerId)))
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!outside)
    throw new Error(`${where}: the player has no tie outside the five`);
  const fifth = circle.closest[circle.closest.length - 1]!;
  const before = outside.level;
  core.relationships.set(outside.id, {
    ...outside,
    level: 0.999,
    lastContactDate: core.date,
    latestChange: {
      version: "core2-relationship-change-v1",
      date: core.date,
      actorId: outside.actorId,
      otherId: outside.otherId,
      kind: outside.kind,
      requestedKind: outside.kind,
      requestedChange: 0.999 - before,
      created: false,
      before: { level: before, lastContactDate: outside.lastContactDate },
      after: { level: 0.999, lastContactDate: core.date },
      cause: "chosen-act",
      sourceRecordRefs: [],
      reason: { cause: "visit", sourceId: outside.id },
    },
  });
  const changed = circleChanges(core, playerId);
  const newcomer = otherOf(outside, playerId);
  const joined = changed.joined.find((c) => c.personId === newcomer);
  expect(joined, `${where}: ${newcomer} joined`).toMatchObject({
    cause: "visit",
    recordId: outside.id,
    date: core.date,
  });
  const left = changed.left.find((c) => c.personId === fifth);
  expect(left, `${where}: ${fifth} left`).toBeDefined();
  expect(left!.cause, where).toBe("no-time-together");
}, 1_200_000);
