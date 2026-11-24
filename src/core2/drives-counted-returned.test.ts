/**
 * Red main (Nov 13): a household returned to the counts keeps its full
 * records, and since #8518 its members answer a counted event through them
 * (drives.ts `stillCounted`). The counted flows name them as the household
 * an onset or a death happened around, with the one it befell as the subject,
 * so nothing had recorded that they lived through it, and with bookkeeping
 * on (tests and the bench) `updateDrive` refused the drive: "Drive requires
 * a learned source event and a finite strength." It stopped a bench world in
 * place 1521230 and the journal-story test on #8961. Here a drawn place's
 * household is filled in, returned to the counts, and then one member dies
 * in the counts, as `births-counted` emits it; the rest answer it, and any
 * drive they take up names the death they lived through.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { isDemoted } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { demoteHousehold } from "./modules/counted-demotion";
import { drivesReport } from "./modules/drives";
import { DEFAULT_HEALTH_DATA, severityImpulse } from "./modules/health";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson, registerModule } from "./state";
import type { CoreState } from "./types";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PLACES = 4;
const KIND = DEFAULT_HEALTH_DATA.countedDeathEventKind;

/** One drawn place: the proof line, or why the place could not show it. */
function attempt(n: number): { proof: string } | { skipped: string } {
  const place = drawPlace(
    createHash("sha256").update(`${base}:${n}`).digest("hex"),
    "drives-counted-returned",
  );
  const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  const circle = new Set([
    core.playerId,
    ...(player?.familyIds ?? []),
    ...(player?.knownIds ?? []),
  ]);
  // A counted household of two or more adults, away from the player's circle.
  const record = [...residentsRuntime(core)!.households.values()]
    .filter(
      (r) =>
        r.people.length >= 2 &&
        r.people.every(
          (p) => !circle.has(p.id) && residentPerson(core, p.id) !== undefined,
        ),
    )
    .sort((a, b) => a.household.id.localeCompare(b.household.id))[0];
  if (!record) return { skipped: `${where}: no counted household of two` };
  const ids = record.people.map((p) => p.id);
  fillInPerson(core, ids[0]!);
  const householdId = core.people.get(ids[0]!)!.householdId;
  // The monthly review's return to the counts, booked for the next day; the
  // day after, the first member dies in the counts, with the household that
  // outlives them named around it, as the counted flows emit a death
  // (births-counted.ts).
  const today = makeIsoDate(core.date);
  const returnedOn = addDays(today, 1);
  const diedOn = addDays(today, 2);
  const [died, ...around] = ids;
  const eventId = `event:${KIND}:${died}:${diedOn}`;
  registerModule(core, {
    id: "test:drives-counted-returned",
    onCalendarWork: (calendarApi, work) => {
      if (work.kind === "test-return")
        demoteHousehold(calendarApi, householdId, today);
      if (work.kind === "test-death")
        calendarApi.emit({
          id: eventId,
          date: diedOn,
          kind: KIND,
          personIds: [],
          placeId: core.people.get(died!)!.placeId,
          topic: `${DEFAULT_HEALTH_DATA.topicPrefix}:${DEFAULT_HEALTH_DATA.unconditionedTopic}`,
          desiredChange: `${DEFAULT_HEALTH_DATA.desiredChangePrefix}:${DEFAULT_HEALTH_DATA.unconditionedTopic}`,
          ...severityImpulse(calendarApi, DEFAULT_HEALTH_DATA.deathSeverity),
          publicRecord: false,
          source: { ...DEFAULT_HEALTH_DATA.source, asOf: diedOn },
          facts: {
            "counted-subject": died!,
            "counted-household": householdId,
            "counted-perceivers": JSON.stringify(around),
          },
        });
    },
  });
  const calendar = api.moduleCalendar("test:drives-counted-returned");
  const source = {
    tag: "ESTIMATED" as const,
    asOf: today,
    citation:
      "The monthly review's return and a counted death, booked for the test.",
    estimatedFrom:
      "A booked return and death exercise the returned household's answer.",
  };
  calendar.schedule({
    key: `return:${householdId}`,
    date: returnedOn,
    kind: "test-return",
    source,
    sourceRecordIds: [householdId],
  });
  calendar.schedule({
    key: `death:${died}`,
    date: diedOn,
    kind: "test-death",
    source,
    sourceRecordIds: [householdId],
  });
  advanceCore(core, makeIsoDate(returnedOn));
  const returned = around.filter((id) => {
    const kept = core.people.get(id);
    return kept?.alive && isDemoted(kept);
  });
  if (!returned.length)
    return { skipped: `${where}: ${householdId} kept no returned member` };
  advanceCore(core, makeIsoDate(diedOn));
  const answers = drivesReport(core as CoreState).decisions.filter(
    (t) => t.eventId === eventId && returned.includes(t.personId),
  );
  if (!answers.length)
    return {
      skipped: `${where}: no returned member of ${householdId} perceived ${eventId}`,
    };
  // Every drive a returned member holds from the death names an event they
  // lived through.
  let drives = 0;
  for (const id of returned)
    for (const drive of core.people.get(id)!.drives.values()) {
      if (drive.sourceEventId !== eventId) continue;
      drives += 1;
      expect(
        api.knows(id, `event:${eventId}:experienced`),
        `${where}: ${id} lived through ${eventId}`,
      ).toBeTruthy();
    }
  if (!drives)
    return {
      skipped: `${where}: the returned members of ${householdId} took up no cause from ${eventId}`,
    };
  return {
    proof: `${where}: ${returned.length} returned member(s) of ${householdId} answered ${eventId} (${answers.length} perceptions, ${drives} drives)`,
  };
}

it(`a household returned to the counts answers a counted death with bookkeeping on (seed ${base})`, () => {
  const was = setBookkeeping(true);
  try {
    const skipped: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const result = attempt(n);
      if ("proof" in result) {
        process.stdout.write(
          `drives-counted-returned ${result.proof}${skipped.length ? `; passed over ${skipped.join("; ")}` : ""}\n`,
        );
        return;
      }
      skipped.push(result.skipped);
    }
    throw new Error(
      `no drawn place showed a returned household answering a counted death (seed ${base}): ${skipped.join("; ")}`,
    );
  } finally {
    setBookkeeping(was);
  }
}, 600_000);
