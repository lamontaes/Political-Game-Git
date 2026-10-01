import { describe, expect, it } from "vitest";
import { adultLifeAt } from "../../tests/fixtures/state-executive-entry";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import { currentPresidentOf } from "../simulation/crisis/offices";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../simulation/congress-rule-pack";
import { presidentDesk } from "../simulation/governing/congress-lawmaking";
import { seatedCongressChamber } from "../simulation/governing/congress-chambers";
import {
  evaluateGovernorBill,
  BILL_SIGN,
  BILL_RETURN,
  GOVERNOR_BILL_DECISION,
} from "../simulation/governing/governor-bill-decision";
import { ensureOfficeholderPrinciples } from "../simulation/governing/officeholder-principles";
import {
  introduceMeasure,
  referMeasure,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  takeFloorVote,
  transmitMeasure,
  enrollMeasure,
  presentMeasureToExecutive,
  requireMeasure,
  measurePosition,
} from "../simulation/legislation";
import {
  committeeMembers,
  dispositionsFromCounts,
} from "../simulation/legislation-scenarios";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../simulation/national-election-geography";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { personName } from "../simulation/people";
import type { EntityId, World } from "../simulation/types";

/** Explicit supplied votes test the desk, not ordinary bill production. */
function presentedBill(world: World): { world: World; measureId: EntityId } {
  let next = introduceMeasure(ensureNationalElectionJurisdiction(world), {
    stableKey: "executive-parity:neutral",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. executive fixture",
    shortTitle: "Neutral executive fixture",
    summary: "Supplied procedure for executive parity.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  const provenance = {
    method: "authored-fixture" as const,
    note: "Explicit supplied roll calls; not ordinary sponsor proof.",
    sourceEntityIds: [world.id],
  };
  for (const chamber of US_CONGRESS_RULE_PACK.chambers) {
    const body = seatedCongressChamber(next, chamber.chamberKey)!.body;
    const committee = chamber.committees[0]!;
    const key = `executive-parity:${chamber.chamberKey}`;
    next = referMeasure(next, {
      stableKey: `${key}:referral`,
      measureId,
      committeeKey: committee.committeeKey,
    });
    next = recordCommitteeDisposition(next, {
      stableKey: `${key}:committee`,
      measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers },
      ),
      rationale: "Supplied committee approval.",
      provenance,
    });
    next = placeMeasureOnCalendar(next, {
      stableKey: `${key}:calendar`,
      measureId,
    });
    for (const stage of chamber.floorStages)
      next = takeFloorVote(next, {
        stableKey: `${key}:${stage.stageKey}`,
        measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance,
      });
    if (chamber.chamberKey === "house")
      next = transmitMeasure(next, { stableKey: `${key}:transmit`, measureId });
  }
  next = enrollMeasure(next, {
    stableKey: "executive-parity:enroll",
    measureId,
  });
  next = presentMeasureToExecutive(next, {
    stableKey: "executive-parity:present",
    measureId,
  });
  return { world: next, measureId };
}
const places = lifePlaceStateIdentities().map((state) => {
  const locality = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0];
  const whole =
    locality ??
    searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
    })[0]!;
  return { state: state.jurisdictionKey, place: whole };
});

describe("Congress uses the surviving executive decision", () => {
  it("covers all 56 jurisdictions", () => {
    expect(new Set(places.map((p) => p.state)).size).toBe(56);
  });
  it.each(places)(
    "neutral-bill parity, actor and reasons in $state",
    ({ state, place }) => {
      const seed = `G6-president-parity:${state}`;
      const opened = adultLifeAt(place.key, seed).world;
      const fixture = presentedBill(opened);
      const world = fixture.world;
      const measure = requireMeasure(world, fixture.measureId);
      const president = currentPresidentOf(world)!;
      const prepared = ensureOfficeholderPrinciples(world, [
        president.personId,
      ]);
      const expected = evaluateGovernorBill(prepared, {
        stableKey: `${measure.stableKey}:president-desk`,
        governorId: president.personId,
        executiveTitle: "President",
        measure,
        staff: null,
      });
      // Main's old presidentialDecision signs neutral bills: no opposing sponsor or own-party vote.
      expect(expected.selectedOptionKey).toBe(BILL_SIGN);
      const next = presidentDesk(world, measure);
      const disposition = next.history.executiveDispositions!.at(-1)!;
      expect(disposition.action).toBe("signed");
      expect(disposition.actedAt).toBe(world.currentDate);
      expect(next.currentDate).toBe(world.currentDate);
      expect(next.personOrder).toEqual(world.personOrder);
      expect(measurePosition(next, measure.id).phase).toBe(
        "awaiting-enactment",
      );
      const trace = next.history.decisionTraces!.find(
        (row) => row.decisionId === expected.decisionId,
      )!;
      expect(trace.selectedOptionKey).toBe(expected.selectedOptionKey);
      expect(trace.context.decisionType).toBe(GOVERNOR_BILL_DECISION);
      expect(trace.context.randomness).toBe("none");
      expect(trace.context.actorPersonId).toBe(president.personId);
      expect(disposition.rationale).toContain(
        "The legislature passed the bill.",
      );
      expect(disposition.rationale).not.toContain("governor");
      const signature = next.history.events.find(
        (e) =>
          e.type === "legislation.measure-signed" &&
          e.involvedEntityIds.includes(measure.id),
      )!;
      expect(signature.participants[0]?.personId).toBe(president.personId);
      expect(signature.summary).toContain(
        personName(next.people[president.personId]!),
      );
      expect(presidentDesk(next, measure)).toBe(next);
      if (state === places[0]!.state) {
        const continued = deserializeWorld(serializeWorld(next));
        expect(presidentDesk(continued, measure)).toBe(continued);
        expect(continued.history.executiveDispositions!.at(-1)).toEqual(
          disposition,
        );
      }
      expect([BILL_SIGN, BILL_RETURN]).toContain(trace.selectedOptionKey);
    },
  );
});
