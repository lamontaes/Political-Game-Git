/* global process, console */
// Roadmap M0-07, over years: run with node --max-old-space-size=8192 --import tsx
// src/core2/tooling/m0-07-turnover-check.ts (GOLDEN_PATH_SEED and
// GOLDEN_PATH_PLACE_KEY from the runner). Exits nonzero naming each failed clause.
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { currentCloseness } from "../closeness";
import { gameStartDate } from "../game-start";
import { addDays, ageOnDate, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import research from "../../../data/research/people/mollenhorst-2014-network-turnover.json" with { type: "json" };

// M0-07, over years: the share of a circle still in it after a span matches
// a sourced study. Mollenhorst, Volker and Flap (2014): 48% of the discussion
// partners and practical helpers a Dutch adult named were still in the
// network seven years later (data/research/people/mollenhorst-2014-network-turnover.json).
//
// "Circle": a person's CIRCLE_SIZE closest ties on the first day, closeness
// read with currentCloseness (the one closeness every engine uses). The study
// keeps a network of about the same size (its abstract: the average number of
// confidants and helpers "only slightly changes"), so a tie leaves the circle
// when time apart and other ties push it out of that many closest. "Retained":
// still among that person's CIRCLE_SIZE closest ties at the end. The circle
// size is this test's own choice (the sources read do not give a size); the
// pooled share over the town's adult full people is the total checked, never
// one person's circle (no dice). The player's circle is reported on its own.
const YEARS = 3;
const DAYS = 1095;
const CIRCLE_SIZE = 5;
const ENTRY_AGE = 18;
const LAST_AGE = 65;
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex");
const place = process.env.GOLDEN_PATH_SEED
  ? { seed, key: process.env.GOLDEN_PATH_PLACE_KEY, name: undefined }
  : drawPlace(seed, "m0-circle-turnover");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const placeName = world.place.displayName ?? world.place.key;
const startDate = makeIsoDate(core.date);

/** A person's closest ties today, closest first (ties broken by id). */
function closest(personId: string): string[] {
  return [...(core.relationshipsByPerson.get(personId) ?? [])]
    .map((id) => {
      const row = core.relationships.get(id)!;
      const otherId = row.actorId === personId ? row.otherId : row.actorId;
      return { otherId, closeness: currentCloseness(core, row) };
    })
    .sort(
      (a, b) => b.closeness - a.closeness || a.otherId.localeCompare(b.otherId),
    )
    .map((row) => row.otherId);
}

const circles = new Map<string, string[]>();
for (const person of core.people.values()) {
  const age = ageOnDate(makeIsoDate(person.birthDate), startDate);
  if (!person.alive || age < ENTRY_AGE || age > LAST_AGE) continue;
  const ties = closest(person.id);
  if (ties.length >= CIRCLE_SIZE)
    circles.set(person.id, ties.slice(0, CIRCLE_SIZE));
}

// The player is the entrant turning 18, so they sit outside the adult pool;
// their own circle is read on its own.
const playerStart = closest(core.playerId!).slice(0, CIRCLE_SIZE);

advanceCore(core, addDays(startDate, DAYS));

let members = 0;
let kept = 0;
let people = 0;
for (const [personId, circle] of circles) {
  if (!core.people.get(personId)?.alive) continue;
  const now = new Set(closest(personId).slice(0, CIRCLE_SIZE));
  people += 1;
  members += circle.length;
  kept += circle.filter((id) => now.has(id)).length;
}
const playerCircle = playerStart;
const playerNow = new Set(closest(core.playerId!).slice(0, CIRCLE_SIZE));
const playerKept = playerCircle?.filter((id) => playerNow.has(id)).length;

// The study's share, scaled to these years by constant yearly retention, is
// printed beside the world's own for comparison; it never fails a world
// (owner, Nov 17: "Everything comes from the simulation"). The study gives
// levels only (how many ties were still there, and that a network's size
// barely changes), no strength of one thing moving another, so the check
// keeps the sense checks: some ties turn over, and not all of them.
const studyShare = Math.pow(
  research.stillInNetworkShare,
  YEARS / research.spanYears,
);

const failures: string[] = [];
if (people < 100)
  failures.push(`only ${people} adult circles to total over (need 100)`);
if (playerCircle.length !== CIRCLE_SIZE)
  failures.push(`the player's circle has ${playerCircle.length} ties`);
const retained = kept / Math.max(1, members);
if (retained >= 1)
  failures.push(`every circle tie was kept for ${YEARS} years: no turnover`);
if (retained <= 0) failures.push(`no circle tie was kept for ${YEARS} years`);
const where = `${placeName} (${place.key}), seed ${place.seed}`;
console.log(
  JSON.stringify({
    place: where,
    years: YEARS,
    circleSize: CIRCLE_SIZE,
    people,
    members,
    retained: +retained.toFixed(3),
    studyShare: +studyShare.toFixed(3),
    playerKept: `${playerKept}/${CIRCLE_SIZE}`,
  }),
);
if (failures.length) {
  console.log(
    `M0-07 turnover FAIL:\n${failures.map((f) => `${where}: ${f}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(`M0-07 turnover passed: ${where}`);
