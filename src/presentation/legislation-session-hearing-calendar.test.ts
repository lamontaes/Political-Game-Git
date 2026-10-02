import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import { enactingGovernmentForPack } from "../simulation/legislation-drafting";
import { US_CONGRESS_RULE_PACK } from "../simulation/congress-rule-pack";
import { NATIONAL_ELECTION_JURISDICTION } from "../simulation/national-election-geography";
import { rulePackById } from "../simulation/legislature-rule-packs";
import type { LegislativeRulePack } from "../simulation/legislature-rules";
import type { LegislativeProcedureContext } from "../simulation/legislation-scenarios";
import { LEGISLATIVE_SESSION_CALENDARS } from "../simulation/legislative-session-calendar-data";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  introduceMeasure,
  referMeasure,
  scheduleCommitteeHearing,
} from "../simulation/legislation";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { makeIsoDate } from "../simulation/dates";
import type { EntityId, World } from "../simulation/types";
import * as ordinaryLife from "./ordinary-life";
import { applyLegislativeStep } from "./legislation-session";

const seed = "a11-player-hearing-calendar-all56";
const place = drawRandomPlace(seed, (candidate) => {
  const jurisdiction = candidate.stateJurisdictionKey
    ? stateJurisdictionForKey(candidate.stateJurisdictionKey)
    : null;
  const pack = jurisdiction
    ? legislativePackForJurisdiction(jurisdiction.id)
    : null;
  return (
    pack !== null && enactingGovernmentForPack(pack)?.government === "state"
  );
});
const fixture = smallWorld({ place: place.key, date: "2026-01-05", seed });
const statePack = legislativePackForJurisdiction(fixture.stateJurisdictionId)!;
const baseWorld: World = {
  ...fixture.world,
  jurisdictions: {
    ...fixture.world.jurisdictions,
    [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
  },
  jurisdictionOrder: [
    ...fixture.world.jurisdictionOrder,
    NATIONAL_ELECTION_JURISDICTION.id,
  ],
};

function context(
  pack: LegislativeRulePack,
  measureId: EntityId,
): LegislativeProcedureContext {
  return {
    pack,
    measureId,
    bodies: [],
    committeeMemberCount: null,
    votePlan: {},
    governorAction: null,
    governorRationale: "Calendar caller fixture; no executive decision.",
  };
}

function filed(pack: LegislativeRulePack, world = baseWorld, referral = true) {
  const introduced = introduceMeasure(world, {
    stableKey: `test:player-hearing:${pack.packId}`,
    jurisdictionId:
      pack.packId === US_CONGRESS_RULE_PACK.packId
        ? NATIONAL_ELECTION_JURISDICTION.id
        : (stateJurisdictionForKey(pack.jurisdictionKey)?.id ??
          fixture.stateJurisdictionId),
    rulePackId: pack.packId,
    designation: "TEST 1",
    shortTitle: "Committee hearing calendar fixture",
    summary: "Tests the player command's canonical hearing scheduling record.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
  });
  const measureId = introduced.history.legislativeMeasures!.at(-1)!.id;
  const chamber = pack.chambers.find(
    (row) => row.chamberKey === pack.chamberOrder[0],
  )!;
  const referred = referral
    ? referMeasure(introduced, {
        stableKey: `test:player-hearing:refer:${pack.packId}`,
        measureId,
        committeeKey: chamber.committees[0]!.committeeKey,
      })
    : introduced;
  return { world: referred, scenario: context(pack, measureId) };
}

function hearings(world: World, measureId: EntityId) {
  return world.history.futureDueItems.filter(
    (row) =>
      row.transitionKey === COMMITTEE_HEARING_TRANSITION_KEY &&
      row.entityIds.includes(measureId),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("the player hearing command uses the session calendar", () => {
  for (const [label, pack] of [
    ["sampled state", statePack],
    ["Congress", US_CONGRESS_RULE_PACK],
  ] as const) {
    it(`uses an authoritative fixture hearing interval for ${label}`, () => {
      // Explicit caller fixture, not a change to a shipped game's timetable.
      const custom: LegislativeRulePack = {
        ...pack,
        session: {
          ...pack.session,
          sittingCalendar: {
            id: "test:eleven-day-hearing",
            basis: "game-profile",
            note: "Authoritative test fixture only; no claim about legal hearing rules.",
            sitting: { kind: "interval", days: 3 },
            tasks: { hearing: { kind: "interval", days: 11 } },
          },
        },
      };
      const input = filed(custom);
      const pass = vi
        .spyOn(ordinaryLife, "passOrdinaryDays")
        .mockImplementation((world) => world);
      const result = applyLegislativeStep(
        input.scenario,
        input.world,
        "request-committee-hearing",
      );
      expect(
        hearings(result.world, input.scenario.measureId).map(
          (row) => row.dueAt,
        ),
      ).toEqual(["2026-01-16"]);
      expect(pass).toHaveBeenCalledWith(result.world, 11);
    });

    it(`retains the seven-day legacy hearing interval for ${label} without a calendar`, () => {
      const session = { ...pack.session };
      delete session.sittingCalendar;
      const input = filed({ ...pack, session });
      const pass = vi
        .spyOn(ordinaryLife, "passOrdinaryDays")
        .mockImplementation((world) => world);
      const result = applyLegislativeStep(
        input.scenario,
        input.world,
        "request-committee-hearing",
      );
      expect(
        hearings(result.world, input.scenario.measureId).map(
          (row) => row.dueAt,
        ),
      ).toEqual(["2026-01-12"]);
      expect(pass).toHaveBeenCalledWith(result.world, 7);
    });

    it(`keeps an existing due date first and avoids duplicates through Continue for ${label}`, () => {
      const input = filed(pack);
      const scheduled = scheduleCommitteeHearing(input.world, {
        stableKey: `test:already-pending:${pack.packId}`,
        measureId: input.scenario.measureId,
        hearingDate: makeIsoDate("2026-01-22"),
      });
      // No calendar is needed to honor a canonical pending appointment.
      const session = { ...pack.session };
      delete session.sittingCalendar;
      const scenario = { ...input.scenario, pack: { ...pack, session } };
      const pass = vi
        .spyOn(ordinaryLife, "passOrdinaryDays")
        .mockImplementation((world) => world);
      const first = applyLegislativeStep(
        scenario,
        scheduled,
        "request-committee-hearing",
      ).world;
      const continued = deserializeWorld(serializeWorld(first));
      const repeated = applyLegislativeStep(
        scenario,
        continued,
        "request-committee-hearing",
      ).world;
      expect(hearings(repeated, scenario.measureId)).toEqual(
        hearings(scheduled, scenario.measureId),
      );
      expect(hearings(repeated, scenario.measureId)).toHaveLength(1);
      expect(pass).toHaveBeenLastCalledWith(continued, 17);
    });
  }

  it("refuses a council calendar with no hearing task instead of using a generic interval", () => {
    const council = rulePackById("us-dc-washington-council-v1");
    const councilWorld = smallWorld({
      place: council.jurisdictionKey,
      date: "2026-01-05",
      seed,
    }).world;
    const input = filed(council, councilWorld, false);
    const scenario = context(
      {
        ...council,
        session: {
          ...council.session,
          sittingCalendar: LEGISLATIVE_SESSION_CALENDARS.council,
        },
      },
      input.scenario.measureId,
    );
    const pass = vi
      .spyOn(ordinaryLife, "passOrdinaryDays")
      .mockImplementation((world) => world);
    expect(() =>
      applyLegislativeStep(scenario, input.world, "request-committee-hearing"),
    ).toThrow(/no 'hearing' task/);
    expect(pass).not.toHaveBeenCalled();
    expect(hearings(input.world, scenario.measureId)).toHaveLength(0);
  });

  it.todo(
    "plays actual player attendance through ordinary days, hearing interruption, and Continue without an advancement spy",
  );
});
