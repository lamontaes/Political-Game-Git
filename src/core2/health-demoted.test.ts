/**
 * A person back in the counts is counted (one model, two tiers; pool:
 * world-staff-hire-counted-job-relocation). The health engine books a full
 * person's serious illness and death ahead; if their household returns to the
 * counts first, the counted flows decide their illness and death from then
 * on, and the health engine does not also kill their kept record. A dead
 * record in a counted household stopped the year when the household was met
 * again (Mamaroneck, New York, January 9, 2026, an heir filled in for an
 * estate; Audubon Park, Kentucky, a staff hire). A household the counts move
 * out of town before it can be met again is named by its move record, and
 * the place is drawn again, a bounded number of times.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { isDemoted } from "./counted-groups";
import { remainingDaysAfterOnset } from "./death-causes";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { demoteHousehold } from "./modules/counted-demotion";
import { countedMoves } from "./modules/counted-moves";
import { healthReport } from "./modules/health";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson, personOrFillIn, registerModule } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const DRAWS = 4;

/** One drawn place: the proof line, or why the place could not show it. */
function attempt(drawSeed: string): { proof: string } | { skipped: string } {
  const place = drawPlace(drawSeed, "core2-health-demoted");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const rt = residentsRuntime(core)!;
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  const circle = new Set([
    core.playerId,
    ...(player?.familyIds ?? []),
    ...(player?.knownIds ?? []),
  ]);
  // Counted households filled in, as meeting them would, a batch at a time;
  // the health engine books the newcomers' health the next day. Households
  // of two or more, so one member is left to meet if the ill one dies.
  const records = [...rt.households.values()]
    .filter(
      (record) =>
        record.people.length >= 2 &&
        record.people.every((p) => !circle.has(p.id)),
    )
    .sort((a, b) => a.household.id.localeCompare(b.household.id));
  let found:
    { personId: string; householdId: string; endsBy: string } | undefined;
  let today = makeIsoDate(core.date);
  for (let at = 0; at < records.length && !found; at += 50) {
    const ids = new Set<string>();
    for (const record of records.slice(at, at + 50)) {
      const first = record.people[0]?.id;
      if (!first || residentPerson(core, first) === undefined) continue;
      for (const p of record.people) ids.add(p.id);
      fillInPerson(core, first);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    today = makeIsoDate(core.date);
    const horizon = addDays(today, 240);
    const booked = healthReport(core)
      .cases.filter(
        (c) =>
          ids.has(c.personId) &&
          c.onsetDate > addDays(today, 1) &&
          c.onsetDate < horizon &&
          core.people.get(c.personId)?.alive,
      )
      .sort((a, b) => a.onsetDate.localeCompare(b.onsetDate))[0];
    if (!booked) continue;
    const person = core.people.get(booked.personId)!;
    const age =
      Number(booked.onsetDate.slice(0, 4)) -
      Number(person.birthDate.slice(0, 4));
    // The illness's course as the health engine sets it at onset.
    const course = remainingDaysAfterOnset({
      age,
      severity: booked.severity,
      covered: null,
    });
    found = {
      personId: booked.personId,
      householdId: person.householdId,
      endsBy: addDays(makeIsoDate(booked.onsetDate), course + 2),
    };
  }
  expect(
    found,
    `${where}: a filled-in person with an illness booked`,
  ).toBeDefined();
  const { personId, householdId, endsBy } = found!;
  // The household goes back to the counts, as the monthly review sends one
  // long out of the player's life: from the next day's calendar work,
  // before anyone in it works that day.
  let demoted: ReturnType<typeof demoteHousehold>;
  registerModule(core, {
    id: "test:health-demoted",
    onCalendarWork: (calendarApi, work) => {
      if (work.kind === "test-demotion")
        demoted = demoteHousehold(calendarApi, householdId, today);
    },
  });
  const demotedOn = addDays(today, 1);
  api.moduleCalendar("test:health-demoted").schedule({
    key: `demote:${householdId}`,
    date: demotedOn,
    kind: "test-demotion",
    source: {
      tag: "ESTIMATED",
      asOf: today,
      citation: "The monthly review's demotion, booked for the test.",
      estimatedFrom: "Owner ruling, Oct 15, 2026: 180 to 240 days",
    },
    sourceRecordIds: [householdId],
  });
  advanceCore(core, makeIsoDate(demotedOn));
  expect(demoted, `${where}: ${householdId} returned`).toBeDefined();
  expect(isDemoted(core.people.get(personId)!)).toBe(true);
  advanceCore(core, makeIsoDate(endsBy));
  const kept = core.people.get(personId)!;
  const booked = healthReport(core).cases.find((c) => c.personId === personId);
  // Counted since the demotion: the health engine began no illness and
  // recorded no death on their kept record.
  expect(booked?.onsetEventId, `${where}: ${personId} onset`).toBeUndefined();
  expect(booked?.deathEventId, `${where}: ${personId} death`).toBeUndefined();
  // A household the counts moved out of town is gone from them alive: its
  // records stay living, and there is no one left in town to meet.
  const moved = countedMoves(api).find(
    (m) =>
      m.direction === "out" &&
      m.householdId === householdId &&
      m.date >= demotedOn,
  );
  if (moved) {
    expect(kept.alive, `${where}: ${personId} moved away alive`).toBe(true);
    return {
      skipped: `${where}: ${householdId} moved out of town as ${moved.id}`,
    };
  }
  // Whether they died meanwhile is the counts' to decide, and their record
  // follows the counts either way.
  const counted = residentPerson(core, personId) !== undefined;
  expect(kept.alive, `${where}: ${personId} record alive`).toBe(counted);
  // Meeting a living member brings the household back whole.
  const living = (
    residentsRuntime(core)!.households.get(householdId)?.people ?? []
  )
    .map((p) => p.id)
    .find((id) => residentPerson(core, id) !== undefined);
  expect(living, `${where}: a living member of ${householdId}`).toBeDefined();
  const back = personOrFillIn(core, living!)!;
  expect(isDemoted(back), `${where}: ${living} back`).toBe(false);
  for (const id of core.households.get(back.householdId)!.memberIds) {
    const member = core.people.get(id)!;
    expect(member.alive, `${where}: ${id} back alive`).toBe(true);
    expect(isDemoted(member), `${where}: ${id} back`).toBe(false);
  }
  return {
    proof: `${where}: ${personId} of ${householdId} returned to the counts on ${demotedOn} before their booked illness; ${counted ? "still counted" : "died in the counts"} through ${endsBy}, household brought back by ${living}`,
  };
}

it(`leaves a person's booked illness to the counts once their household returns to them, so meeting it again brings everyone back (seed ${seed})`, () => {
  const was = setBookkeeping(false);
  try {
    const skipped: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const result = attempt(draw ? `${seed}:${draw}` : seed);
      if ("proof" in result) {
        console.info(
          `health-demoted ${result.proof}${skipped.length ? `; drawn again after ${skipped.join("; ")}` : ""}`,
        );
        return;
      }
      skipped.push(result.skipped);
    }
    throw new Error(
      `No drawn place kept its returned household in town to meet again: ${skipped.join("; ")}`,
    );
  } finally {
    setBookkeeping(was);
  }
}, 1_800_000);
