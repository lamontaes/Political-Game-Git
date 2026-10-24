/**
 * A person back in the counts is counted (one model, two tiers; pool:
 * world-staff-hire-counted-job-relocation). The health engine books a full
 * person's serious illness and death ahead; if their household returns to the
 * counts first, the counted flows decide their illness and death from then
 * on, and the health engine does not also kill their kept record. A dead
 * record in a counted household stopped the year when the household was met
 * again (Mamaroneck, New York, January 9, 2026, an heir filled in for an
 * estate; Audubon Park, Kentucky, a staff hire).
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
import { healthReport } from "./modules/health";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson, personOrFillIn } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-health-demoted");
const where = `${place.name} (${place.key}), seed ${seed}`;

it(`leaves a person's booked illness to the counts once their household returns to them, so meeting it again brings everyone back (${where})`, () => {
  const was = setBookkeeping(false);
  try {
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
    // the health engine books the newcomers' health the next day.
    const records = [...rt.households.values()]
      .filter((record) => record.people.every((p) => !circle.has(p.id)))
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
            c.onsetDate > today &&
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
      break;
    }
    expect(
      found,
      `${where}: a filled-in person with an illness booked`,
    ).toBeDefined();
    const { personId, householdId, endsBy } = found!;
    // The household goes back to the counts, as the monthly review sends one
    // long out of the player's life.
    expect(demoteHousehold(api, householdId, today)).toBeDefined();
    expect(isDemoted(core.people.get(personId)!)).toBe(true);
    advanceCore(core, makeIsoDate(endsBy));
    const kept = core.people.get(personId)!;
    const booked = healthReport(core).cases.find(
      (c) => c.personId === personId,
    );
    // Counted since the demotion: the health engine began no illness and
    // recorded no death on their kept record.
    expect(booked?.onsetEventId, `${where}: ${personId} onset`).toBeUndefined();
    expect(booked?.deathEventId, `${where}: ${personId} death`).toBeUndefined();
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
    if (!living) return;
    const back = personOrFillIn(core, living)!;
    expect(isDemoted(back), `${where}: ${living} back`).toBe(false);
    for (const id of core.households.get(back.householdId)!.memberIds) {
      const member = core.people.get(id)!;
      expect(member.alive, `${where}: ${id} back alive`).toBe(true);
      expect(isDemoted(member), `${where}: ${id} back`).toBe(false);
    }
    console.info(
      `health-demoted ${where}: ${personId} of ${householdId} returned to the counts on ${today} before their booked illness; ${counted ? "still counted" : "died in the counts"} through ${endsBy}, household brought back by ${living}`,
    );
  } finally {
    setBookkeeping(was);
  }
}, 900_000);
