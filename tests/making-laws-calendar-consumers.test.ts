import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { addDays, makeIsoDate } from "../src/simulation/dates";
import { governmentUnitsForState } from "../src/simulation/government-units";
import { lifePlaceByKey } from "../src/simulation/life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { drawLegislativeStartingProcedures } from "../src/simulation/legislative-starting-procedures";
import { legislativeProcedureForJurisdiction } from "../src/simulation/legislative-procedure-world";
import { ensureWorldStartingConditions } from "../src/simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../src/simulation/world-setup/types";
import { chamberByKey } from "../src/simulation/legislature-rules";
import { LEGISLATIVE_SESSION_CALENDARS } from "../src/simulation/legislative-session-calendar-data";
import type { SittingCalendar } from "../src/simulation/legislative-session-calendar";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";
import {
  introduceMeasure,
  referMeasure,
  placeMeasureOnCalendar,
  measurePosition,
} from "../src/simulation/legislation";
import {
  scheduleGoverningSeasons,
  GOVERNING_SEASON,
} from "../src/simulation/governing/governing-calendar";
import {
  scheduleInstitutionStep,
  LEGISLATIVE_INSTITUTION_STEP,
  measureSessionIsClosed,
} from "../src/simulation/governing/legislative-clock";
import {
  scheduleLocalMemberAgendaIntakes,
  LOCAL_MEMBER_AGENDA_INTAKE,
} from "../src/simulation/governing/member-agenda";
import { AUTOMATIC_LAW_POSITION_MAPPINGS } from "../src/simulation/governing/automatic-legislation";
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
} from "../src/simulation/local-ordinance-game-profile";
import { localFiscalAuthorityFor } from "../src/simulation/local-fiscal-authority";
import { ensureLocalGovernmentOrganization } from "../src/simulation/nationwide-world/local-governments";
import { ensureMunicipalCouncilOpening } from "../src/simulation/municipal-council-opening";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../src/simulation/municipal-government";
import {
  municipalSeats,
  introduceMunicipalOrdinance,
} from "../src/simulation/municipal-public-work";
import {
  placeMunicipalOrdinanceOnAgenda,
  scheduleOrdinaryCouncilReading,
  municipalOrdinanceStatus,
  COUNCIL_READING_DUE,
} from "../src/simulation/municipal-ordinance-procedure";
import {
  serializeWorld,
  deserializeWorld,
} from "../src/simulation/serialization";
import type { World } from "../src/simulation/types";

const SEED = "making-laws-calendar-consumers-20261002";
function sample<T>(entries: readonly T[], key: (entry: T) => string): T[] {
  return entries
    .map((entry) => ({
      entry,
      rank: createHash("sha256")
        .update(`${SEED}:${key(entry)}`)
        .digest("hex"),
    }))
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .slice(0, 5)
    .map(({ entry }) => entry);
}
const procedures = drawLegislativeStartingProcedures({ seed: SEED });
const states = sample(
  CHIEF_EXECUTIVE_JURISDICTIONS.filter((usps) => procedures[`US-${usps}`]),
  (usps) => usps,
);
const biennial = sample(
  CHIEF_EXECUTIVE_JURISDICTIONS.filter(
    (usps) => procedures[`US-${usps}`]?.sessionCadence === "biennial",
  ),
  (usps) => usps,
);
const councils = sample(
  CHIEF_EXECUTIVE_JURISDICTIONS.flatMap(governmentUnitsForState).flatMap(
    (unit) => {
      const place = unit.placeGeoid ? lifePlaceByKey(unit.placeGeoid) : null;
      const scope = localFiscalGameAuthorityForRulePackId(
        `${unit.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
      );
      const government = municipalGovernmentByKey(unit.id);
      const rules = government ? municipalRulePackFor(government) : null;
      return unit.functionalActive &&
        unit.unitType === "municipality" &&
        place &&
        scope &&
        rules?.ok
        ? [{ unit, place, scope, pack: rules.pack }]
        : [];
    },
  ),
  ({ unit }) => unit.id,
);

function stateOpening(usps: string, date = "2026-01-05") {
  const opening = smallWorld({ place: usps, seed: SEED, date });
  const world = ensureWorldStartingConditions(opening.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
  });
  const procedure = legislativeProcedureForJurisdiction(
    world,
    opening.stateJurisdictionId,
  )!;
  return { ...opening, world, procedure };
}
function stateBill(usps: string) {
  const entry = procedures[`US-${usps}`]!;
  const year = entry.sessionYearParity === "odd" ? 2025 : 2026;
  const opening = stateOpening(usps, `${year}-01-05`);
  const pack = opening.procedure.baselinePack;
  const chamber = pack.chambers[0]!;
  let world = introduceMeasure(opening.world, {
    stableKey: `calendar-consumer:${usps}:measure`,
    rulePackId: pack.packId,
    jurisdictionId: opening.stateJurisdictionId,
    ...nextMeasureNumbering(opening.world, {
      jurisdictionId: opening.stateJurisdictionId,
      rulePackId: pack.packId,
      originChamber: chamberByKey(pack, chamber.chamberKey),
    }),
    shortTitle: "Meeting records policy",
    summary: "Authored nonfiscal calendar fixture.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: chamber.chamberKey,
    sponsorPersonId: opening.world.personOrder[1]!,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const committee = chamber.committees[0];
  world = committee
    ? referMeasure(world, {
        stableKey: `${measure.stableKey}:referral`,
        measureId: measure.id,
        committeeKey: committee.committeeKey,
      })
    : placeMeasureOnCalendar(world, {
        stableKey: `${measure.stableKey}:floor`,
        measureId: measure.id,
      });
  expect(["in-committee", "on-floor"]).toContain(
    measurePosition(world, measure.id).phase,
  );
  return { ...opening, world, measure };
}
function localOpening(entry: (typeof councils)[number]) {
  const opening = smallWorld({
    place: entry.place.key,
    date: "2026-02-10",
    seed: SEED,
  });
  const organized = ensureLocalGovernmentOrganization(
    opening.world,
    entry.unit,
  );
  const seated = ensureMunicipalCouncilOpening(organized, entry.unit.id);
  const member = municipalSeats(seated, entry.unit.id).find(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  expect(member).toBeDefined();
  if (!member) throw new Error(`No seated councilor for ${entry.unit.id}`);
  const world: World = {
    ...seated,
    control: { kind: "person", personId: member.personId },
  };
  return { ...opening, world, organized };
}

// These cases verify consumers and saved dates. Normal clock execution and
// player UI interaction remain explicit pending work below.
describe(`Making Laws calendar consumers (seed ${SEED})`, () => {
  it("discovers five eligible state and local cases from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(states).toHaveLength(5);
    expect(biennial).toHaveLength(
      Object.keys(procedures).filter(
        (key) => procedures[key]!.sessionCadence === "biennial",
      ).length,
    );
    expect(councils).toHaveLength(5);
    expect(new Set(councils.map(({ unit }) => unit.id)).size).toBe(5);
  });

  it.each(biennial)(
    "%s: bill parity and annual budget survive repeat scheduling and Continue",
    (usps) => {
      // Keep the locality's opening winter offset valid; this is a date-input
      // control after the last annual bill day, not a clock/DST advancement.
      const opening = stateOpening(usps, "2026-11-15");
      const officeKey = `governor:${usps}`;
      const scheduled = scheduleGoverningSeasons(
        opening.world,
        officeKey,
        opening.stateJurisdictionId,
      );
      const due = scheduled.history.futureDueItems.filter(
        (item) => item.transitionKey === GOVERNING_SEASON,
      );
      expect(due).toHaveLength(2);
      expect(
        due.find((item) => item.stableKey.includes(":budget:"))?.dueAt,
      ).toBe("2026-12-01");
      expect(due.find((item) => item.stableKey.includes(":bill:"))?.dueAt).toBe(
        opening.procedure.sessionYearParity === "odd"
          ? "2027-02-15"
          : "2028-02-15",
      );
      const resumed = deserializeWorld(serializeWorld(scheduled));
      expect(
        scheduleGoverningSeasons(
          resumed,
          officeKey,
          opening.stateJurisdictionId,
        ),
      ).toEqual(resumed);
    },
  );

  it.each(states)(
    "%s: actual introduced measure retains one pending institution step and its override date",
    (usps) => {
      const { world, measure } = stateBill(usps);
      const scheduled = scheduleInstitutionStep(world, measure.id);
      const due = scheduled.history.futureDueItems.filter(
        (item) =>
          item.transitionKey === LEGISLATIVE_INSTITUTION_STEP &&
          item.entityIds.includes(measure.id),
      );
      expect(due).toHaveLength(1);
      expect(due[0]!.dueAt).toBe(addDays(world.currentDate, 3));
      const resumed = deserializeWorld(serializeWorld(scheduled));
      expect(
        scheduleInstitutionStep(
          resumed,
          measure.id,
          addDays(world.currentDate, 9),
        ),
      ).toEqual(resumed);
      const overridden = scheduleInstitutionStep(
        world,
        measure.id,
        addDays(world.currentDate, 9),
      );
      expect(overridden.history.futureDueItems.at(-1)!.dueAt).toBe(
        addDays(world.currentDate, 9),
      );
      expect(
        scheduleInstitutionStep(
          world,
          measure.id,
          world.currentDate,
        ).history.futureDueItems.at(-1)!.dueAt,
      ).toBe(addDays(world.currentDate, 3));
    },
  );

  it.each(states)(
    "%s: saved timetable rows change due dates without changing the bill or voting",
    (usps) => {
      const { world, measure, procedure, stateJurisdictionId } =
        stateBill(usps);
      const calendar: SittingCalendar = {
        ...LEGISLATIVE_SESSION_CALENDARS.state,
        id: "test:explicit-saved-calendar",
        note: "Fictional saved timetable control, not a legal rule or an action permission.",
        sitting: { kind: "interval", days: 5 },
        tasks: {
          ...LEGISLATIVE_SESSION_CALENDARS.state.tasks,
          bill: { kind: "annual", monthDays: ["02-03"] },
          budget: { kind: "annual", monthDays: ["03-08"] },
        },
      };
      const saved: World = {
        ...world,
        history: {
          ...world.history,
          worldConditions: world.history.worldConditions!.map((record) =>
            record.kind === "legislative-starting-procedures"
              ? {
                  ...record,
                  procedures: {
                    ...record.procedures,
                    [procedure.jurisdictionKey]: {
                      ...procedure,
                      baselinePack: {
                        ...procedure.baselinePack,
                        session: {
                          ...procedure.baselinePack.session,
                          sittingCalendar: calendar,
                        },
                      },
                    },
                  },
                }
              : record,
          ),
        },
      };
      const seasons = scheduleGoverningSeasons(
        saved,
        `governor:${usps}`,
        stateJurisdictionId,
      );
      const dues = seasons.history.futureDueItems.filter(
        (item) => item.transitionKey === GOVERNING_SEASON,
      );
      expect(
        dues.find((item) => item.stableKey.includes(":bill:"))?.dueAt,
      ).toBe(`${world.currentDate.slice(0, 4)}-02-03`);
      expect(
        dues.find((item) => item.stableKey.includes(":budget:"))?.dueAt,
      ).toBe(`${world.currentDate.slice(0, 4)}-03-08`);
      const scheduled = scheduleInstitutionStep(seasons, measure.id);
      const due = scheduled.history.futureDueItems.find(
        (item) => item.transitionKey === LEGISLATIVE_INSTITUTION_STEP,
      )!;
      expect(due.dueAt).toBe(addDays(world.currentDate, 5));
      expect(due.provenance.note).toContain(calendar.id);
      expect(scheduled.history.legislativeMeasures).toEqual(
        world.history.legislativeMeasures,
      );
      expect(scheduled.history.legislativeVotes).toEqual(
        world.history.legislativeVotes,
      );
      const resumed = deserializeWorld(serializeWorld(scheduled));
      expect(scheduleInstitutionStep(resumed, measure.id)).toEqual(resumed);
    },
  );

  it.each(states)(
    "%s: saved adjournment stops a bill unless its saved procedure permits carryover",
    (usps) => {
      const { world, measure, procedure } = stateBill(usps);
      // Explicit alternate saved procedural controls, based on the production
      // opening record; no action permission, member, or due item is fabricated.
      const afterAdjournment = (carry: boolean): World => ({
        ...world,
        currentDate: makeIsoDate(`${world.currentDate.slice(0, 4)}-12-20`),
        currentMoment: {
          ...world.currentMoment,
          date: makeIsoDate(`${world.currentDate.slice(0, 4)}-12-20`),
        },
        history: {
          ...world.history,
          worldConditions: world.history.worldConditions!.map((record) =>
            record.kind === "legislative-starting-procedures"
              ? {
                  ...record,
                  procedures: {
                    ...record.procedures,
                    [procedure.jurisdictionKey]: {
                      ...procedure,
                      measuresCarryOver: carry,
                      regularSessionCutoff: { month: 4, day: 30 },
                    },
                  },
                }
              : record,
          ),
        },
      });
      const stopped = afterAdjournment(false);
      expect(measureSessionIsClosed(stopped, measure.id).closed).toBe(true);
      expect(scheduleInstitutionStep(stopped, measure.id)).toEqual(stopped);
      const carried = afterAdjournment(true);
      expect(measureSessionIsClosed(carried, measure.id).closed).toBe(true);
      const scheduled = scheduleInstitutionStep(
        carried,
        measure.id,
        addDays(carried.currentDate, 1),
      );
      const year = Number(carried.currentDate.slice(0, 4));
      expect(scheduled.history.futureDueItems.at(-1)!.dueAt).toBe(
        `${year + (procedure.sessionCadence === "biennial" ? 2 : 1)}-02-15`,
      );
      expect(deserializeWorld(serializeWorld(scheduled))).toEqual(scheduled);
    },
  );

  describe.each(councils)("admitted council $place.key", (entry) => {
    it("writes quarterly intake only after an actual seated member has local fiscal authority", () => {
      const { world, organized } = localOpening(entry);
      const keys = AUTOMATIC_LAW_POSITION_MAPPINGS.filter(
        (mapping) => mapping.governmentLevel === "municipality",
      ).map((mapping) => mapping.propositionKey);
      expect(
        keys.some(
          (key) => localFiscalAuthorityFor(world, entry.unit.id, key).ok,
        ),
      ).toBe(true);
      const select = (at: World) =>
        at.history.futureDueItems.filter(
          (item) =>
            item.transitionKey === LOCAL_MEMBER_AGENDA_INTAKE &&
            item.jurisdictionId === entry.scope.jurisdictionId,
        );
      expect(select(scheduleLocalMemberAgendaIntakes(organized))).toHaveLength(
        0,
      );
      const scheduled = scheduleLocalMemberAgendaIntakes(world);
      expect(select(scheduled)).toHaveLength(1);
      expect(select(scheduled)[0]!.dueAt).toBe("2026-04-01");
      const resumed = deserializeWorld(serializeWorld(scheduled));
      expect(scheduleLocalMemberAgendaIntakes(resumed)).toEqual(resumed);
    });

    it("schedules an actually introduced ordinance no earlier than its compiled minimum", () => {
      const { world } = localOpening(entry);
      const filed = introduceMunicipalOrdinance(world, {
        governmentKey: entry.unit.id,
        designation: "Ord. 26-1",
        shortTitle: "Meeting room policy",
        summary: "Nonfiscal reading calendar fixture.",
      });
      expect(filed.ok).toBe(true);
      if (!filed.ok) throw new Error(filed.reason);
      const measure = filed.world.history.legislativeMeasures!.at(-1)!;
      const placed = placeMunicipalOrdinanceOnAgenda(filed.world, {
        governmentKey: entry.unit.id,
        measureId: measure.id,
      });
      expect(placed.ok).toBe(true);
      if (!placed.ok) throw new Error(placed.reason);
      const earliest = municipalOrdinanceStatus(
        placed.world,
        entry.unit.id,
        measure.id,
      )!.earliestPassageOn;
      const scheduled = scheduleOrdinaryCouncilReading(
        placed.world,
        entry.unit.id,
        measure.id,
      );
      const due = scheduled.history.futureDueItems.filter(
        (item) =>
          item.transitionKey === COUNCIL_READING_DUE &&
          item.entityIds.includes(measure.id),
      );
      expect(due).toHaveLength(1);
      expect(due[0]!.dueAt).toBe(
        earliest && earliest > world.currentDate
          ? earliest
          : addDays(world.currentDate, 1),
      );
      const resumed = deserializeWorld(serializeWorld(scheduled));
      expect(
        scheduleOrdinaryCouncilReading(resumed, entry.unit.id, measure.id),
      ).toEqual(resumed);
    });
  });
  it.todo(
    "normal clock dispatch executes these saved due items in the Making Laws journey",
  );
  it.todo(
    "the player's actual UI session renders and executes the shared calendar journey",
  );
});
