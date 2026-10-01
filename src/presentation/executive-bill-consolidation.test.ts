import { afterAll, describe, expect, it } from "vitest";
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
import {
  measureCosponsors,
  seatedCongressChamber,
} from "../simulation/governing/congress-chambers";
import {
  evaluateGovernorBill,
  BILL_SIGN,
  BILL_RETURN,
  GOVERNOR_BILL_DECISION,
} from "../simulation/governing/governor-bill-decision";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "../simulation/governing/officeholder-principles";
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
  measureVotes,
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
import { publicPartyAffiliation } from "../simulation/living-world/congress";
import { nationalPartyKeys } from "../simulation/governing/congress-chambers";
import type {
  EntityId,
  LegislativeMeasureRecord,
  World,
} from "../simulation/types";

// Frozen decision reference from runtime main a20dad95; test-only, not a production fallback.
function partyKeyOf(world: World, personId: EntityId): string | null {
  const organizationId = publicPartyAffiliation(world, personId);
  return organizationId
    ? (nationalPartyKeys(world).get(organizationId) ?? null)
    : null;
}

/**
 * What a non-player President does with a bill.
 *
 * PLACEHOLDER until research question how-congress-moves-bills is
 * answered. The President signs a bill that carries the name of a member of
 * their own party. Otherwise they veto it when most of their own party's
 * members who voted on it in either House voted no, and sign it when their
 * party did not object.
 */
function legacyPresidentialDecision(
  world: World,
  measure: LegislativeMeasureRecord,
  presidentPersonId: EntityId,
): { readonly action: "signed" | "vetoed"; readonly rationale: string } {
  const party = partyKeyOf(world, presidentPersonId);
  const backers = [
    ...(measure.sponsorPersonId ? [measure.sponsorPersonId] : []),
    ...measureCosponsors(world, measure.id),
  ];
  if (
    party &&
    backers.some((personId) => partyKeyOf(world, personId) === party)
  )
    return {
      action: "signed",
      rationale:
        "The bill carries the name of a member of the President's party.",
    };
  if (party) {
    const sameParty = new Set<EntityId>();
    for (const chamberKey of ["house", "senate"]) {
      for (const member of seatedCongressChamber(world, chamberKey)?.body
        .members ?? [])
        if (member.personId && member.partyKey === party)
          sameParty.add(member.personId);
    }
    for (const vote of measureVotes(world, measure.id)) {
      if (vote.purpose !== "floor-stage") continue;
      let yea = 0;
      let nay = 0;
      for (const entry of vote.dispositions) {
        if (!entry.personId || !sameParty.has(entry.personId)) continue;
        if (entry.disposition === "yea") yea += 1;
        if (entry.disposition === "nay") nay += 1;
      }
      if (nay > yea)
        return {
          action: "vetoed",
          rationale:
            "Most of the President's own party in Congress voted against the bill.",
        };
    }
  }
  return {
    action: "signed",
    rationale: "The President's party raised no objection to the bill.",
  };
}

/** Explicit supplied votes test the desk, not ordinary bill production. */
function presentedBill(
  world: World,
  propositionAnswers?: LegislativeMeasureRecord["propositionAnswers"],
): { world: World; measureId: EntityId } {
  let next = introduceMeasure(ensureNationalElectionJurisdiction(world), {
    stableKey: "executive-parity:neutral",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. executive fixture",
    shortTitle: "Neutral executive fixture",
    summary: "Supplied procedure for executive parity.",
    propositionAnswers,
    propositionIds: propositionAnswers?.map((row) => row.propositionId),
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

const comparisons: {
  state: string;
  seed: string;
  president: string;
  question: string;
  answer: "yes" | "no";
  old: string;
  next: string;
  reasons: string[];
}[] = [];
afterAll(() => {
  console.log(
    "G6_SAME_SEED_COMPARISON " +
      JSON.stringify({
        source: "a20dad95b8251f76acc8e775c041163d95a1cad7",
        total: comparisons.length,
        changed: comparisons.filter((r) => r.old !== r.next).length,
        rows: comparisons,
      }),
  );
});

describe("Congress uses the surviving executive decision", () => {
  it("covers all 56 jurisdictions", () => {
    expect(new Set(places.map((p) => p.state)).size).toBe(56);
  });
  it.each(places)(
    "same-seed non-neutral old/new decision, actor and reasons in $state",
    ({ state, place }) => {
      const seed = `G6-president-parity:${state}`;
      const opened = adultLifeAt(place.key, seed).world;
      const president = currentPresidentOf(opened)!;
      const formed = ensureOfficeholderPrinciples(opened, [president.personId]);
      const questions = formed.policyCatalog.propositionOrder.filter((id) =>
        formed.policyCatalog.issues[
          formed.policyCatalog.propositions[id]!.issueId
        ]!.stableKey.startsWith("us-federal:"),
      );
      const ranked = questions
        .map((id) => ({
          id,
          score: principledLeaning(formed, president.personId, id).score,
        }))
        .sort(
          (a, b) =>
            Math.abs(b.score) - Math.abs(a.score) || a.id.localeCompare(b.id),
        );
      const question = ranked[0]!;
      expect(question).toBeDefined();
      // A real federal question answered against the actual President's strongest recorded leaning.
      // No beliefs, relationships, parties or votes are rewritten between the two decision arms.
      const answer = question.score >= 0 ? "no" : "yes";
      const fixture = presentedBill(formed, [
        { propositionId: question.id, answer },
      ]);
      const world = fixture.world;
      const measure = requireMeasure(world, fixture.measureId);
      const prepared = ensureOfficeholderPrinciples(world, [
        president.personId,
      ]);
      const old = legacyPresidentialDecision(
        prepared,
        measure,
        president.personId,
      );
      const expected = evaluateGovernorBill(prepared, {
        stableKey: `${measure.stableKey}:president-desk`,
        governorId: president.personId,
        executiveTitle: "President",
        measure,
        staff: null,
      });
      expect(old.action).toBe("signed"); // Supplied unanimous votes, no sponsor/cosponsor party shortcut.
      const expectedAction =
        expected.selectedOptionKey === BILL_SIGN ? "signed" : "vetoed";
      comparisons.push({
        state,
        seed,
        president: personName(prepared.people[president.personId]!),
        question: prepared.policyCatalog.propositions[question.id]!.stableKey,
        answer,
        old: old.action,
        next: expectedAction,
        reasons: expected.context.considerations.map((r) => r.explanation),
      });
      const next = presidentDesk(world, measure);
      const disposition = next.history.executiveDispositions!.at(-1)!;
      expect(disposition.action).toBe(expectedAction);
      expect(disposition.actedAt).toBe(world.currentDate);
      expect(next.currentDate).toBe(world.currentDate);
      expect(next.personOrder).toEqual(world.personOrder);
      expect(measurePosition(next, measure.id).phase).toBe(
        expectedAction === "signed"
          ? "awaiting-enactment"
          : "awaiting-override",
      );
      const trace = next.history.decisionTraces!.find(
        (row) => row.decisionId === expected.decisionId,
      )!;
      expect(trace.selectedOptionKey).toBe(expected.selectedOptionKey);
      expect(trace.context.decisionType).toBe(GOVERNOR_BILL_DECISION);
      expect(trace.context.randomness).toBe("none");
      expect(trace.context.actorPersonId).toBe(president.personId);
      expect(disposition.rationale).toContain(
        expectedAction === "signed"
          ? "The legislature passed the bill."
          : "The bill cuts against the president's principles.",
      );
      expect(disposition.rationale).not.toContain("governor");
      const signature = next.history.events.find(
        (e) =>
          e.type ===
            (expectedAction === "signed"
              ? "legislation.measure-signed"
              : "legislation.measure-vetoed") &&
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
