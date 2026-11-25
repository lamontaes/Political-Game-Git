/**
 * A person back in the counts is counted (one model, two tiers; pool:
 * world-staff-hire-counted-job-relocation). The health engine books a full
 * person's serious illness and death ahead; if their household returns to the
 * counts first, the counted flows decide their illness and death from then
 * on, and the health engine does not also kill their kept record. A dead
 * record in a counted household stopped the year when the household was met
 * again (Mamaroneck, New York, January 9, 2026, an heir filled in for an
 * estate; Audubon Park, Kentucky, a staff hire). A household the counts move
 * out of town before it can be met again is named by its move record.
 *
 * Pinned (lead, Nov 16): places and world seeds where the case is known
 * to occur, found by scanning drawPlace("hdpin:<n>", "core2-health-demoted")
 * for n = 0 to 9 on train3 6e9df72b18: nine of ten showed it; Hagatna, Guam
 * (hdpin:9) was passed over because an employer hired the person back into
 * play before their illness. The two fastest are pinned (lead: two prove the
 * case and keep the cost near the pinned-tests limit). A place that passes over now
 * fails, by name.
 * GOLDEN_PATH_SEED with GOLDEN_PATH_PLACE_KEY replays one other place instead.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { isDemoted } from "./counted-groups";
import { remainingDaysAfterOnset } from "./death-cause";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { demoteHousehold } from "./modules/counted-demotion";
import { countedMoves } from "./modules/counted-moves";
import { healthReport } from "./modules/health";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson, personOrFillIn, registerModule } from "./state";

/** Where the case is known to occur (the scan in the header), smallest first. */
const PINNED = [
  {
    name: "Turbeville, South Carolina",
    /** 52.0 s alone, 52.6 s beside day-zero (Nov 16); about twice the slower. */
    limit: 105_000,
    key: "4572745",
    seed: "8bd0e1dca037198baaa28e2c866d14d5588530379078c3af4dc10721e7d82eca",
  },
  {
    name: "Crosby, North Dakota",
    /** 60.7 s alone, 62.6 s beside day-zero (Nov 16); about twice the slower. */
    limit: 125_000,
    key: "3816940",
    seed: "de2ca99797ae744d654ebb148050372647033f9108f0ee6b9cdcacc42e6141ad",
  },
];
const replay =
  process.env.GOLDEN_PATH_SEED && process.env.GOLDEN_PATH_PLACE_KEY
    ? [
        {
          name: `place ${process.env.GOLDEN_PATH_PLACE_KEY}`,
          key: process.env.GOLDEN_PATH_PLACE_KEY,
          seed: process.env.GOLDEN_PATH_SEED,
          limit: 300_000,
        },
      ]
    : null;

/** One drawn place: the proof line, or why the place could not show it. */
function attempt(place: {
  name: string;
  key: string;
  seed: string;
}): { proof: string } | { skipped: string } {
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
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
      estimatedFrom:
        "A scheduled demotion exercises the household return path.",
    },
    sourceRecordIds: [householdId],
  });
  advanceCore(core, makeIsoDate(demotedOn));
  expect(demoted, `${where}: ${householdId} returned`).toBeDefined();
  expect(isDemoted(core.people.get(personId)!)).toBe(true);
  advanceCore(core, makeIsoDate(endsBy));
  const kept = core.people.get(personId)!;
  // Another engine may bring the person back into play before their illness
  // (an employer's hire fills them in, staff.ts hireStaff); the health engine
  // then runs their booked illness as a full person's, so this place cannot
  // show the counted case.
  if (!isDemoted(kept))
    return {
      skipped: `${where}: ${personId} was brought back into play before ${endsBy}`,
    };
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

for (const place of replay ?? PINNED)
  it(
    `leaves a person's booked illness to the counts once their household returns to them, so meeting it again brings everyone back: ${place.name} (${place.key}), seed ${place.seed}`,
    () => {
      const was = setBookkeeping(false);
      try {
        const result = attempt(place);
        if ("skipped" in result)
          throw new Error(`Passed over: ${result.skipped}`);
        console.info(`health-demoted ${result.proof}`);
      } finally {
        setBookkeeping(was);
      }
    },
    place.limit,
  );
