import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { daysBetween } from "../dates";
import { isEligibleVoterIn } from "../issue-record";
import { stateJurisdictionForKey } from "../life-places";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { advanceWorld } from "../world";
import {
  choosePrimaryPartyBallot,
  considerPrimaryPartyBallots,
} from "./primary-ballot-actions";
import { nominationPlan, nominationRuleRow } from "./nomination-rules";
import {
  holdNominationPrimary,
  nominationPrimaryRecord,
  nominationNominees,
} from "./party-nominations";
import {
  primaryVoterAccessFor,
  recordedPrimaryBallotSelectionAt,
  recordPrimaryPartyRegistration,
} from "./primary-voter-access";

function setup(access: string, seed: string) {
  const place = drawRandomPlace(seed, (candidate) => {
    const state = candidate.stateJurisdictionKey?.slice(3);
    return (
      candidate.scope === "locality" &&
      state !== undefined &&
      primaryVoterAccessFor(state) === access &&
      nominationRuleRow(state)?.method === "party-primary"
    );
  });
  const built = smallWorld({ place: place.key, seed, people: 8 });
  const stateUsps = place.stateJurisdictionKey!.slice(3);
  const plan = nominationPlan(built.world, {
    stateUsps,
    family: "us-house",
    year: 2026,
    onDate: built.world.currentDate,
  });
  if (!plan.known) throw new Error(plan.reason);
  const world = advanceWorld(
    built.world,
    daysBetween(built.world.currentDate, plan.primaryDate),
  );
  const adults = world.personOrder.filter((id) =>
    isEligibleVoterIn(world, id, built.jurisdictionId, world.currentDate),
  );
  expect(adults.length, `${place.displayName}; ${seed}`).toBeGreaterThanOrEqual(
    4,
  );
  const field = {
    stableKey: `ballot-action:${seed}`,
    jurisdictionId: built.jurisdictionId,
    stateUsps,
    electionDate: plan.primaryDate,
    entrants: adults.slice(0, 2).map((personId) => ({
      personId,
      party: "party-a",
      incumbent: false,
      partyBacked: false,
    })),
  };
  return {
    world,
    field,
    voter: adults[2]!,
    secondVoter: adults[3]!,
    plan,
    place,
  };
}

function support(world: World, voter: EntityId, candidate: EntityId) {
  return recordPrivateBelief(world, {
    stableKey: `ballot-view:${voter}:${candidate}`,
    personId: voter,
    propositionId: null,
    subject: { kind: "official", personId: candidate },
    formedAt: world.currentDate,
    position: "support",
    conviction: "strong",
    salience: "high",
    flexibility: "negotiable",
    rationale: "The elector supports this candidate's recorded work.",
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId: null,
  });
}

describe("ordinary primary ballot actions", () => {
  it("the production primary caller records a view-based ballot decision and nominates without manually writing a choice", () => {
    const f = setup("Open", "a114-ordinary-open-action");
    const world = support(f.world, f.voter, f.field.entrants[0]!.personId);
    const held = holdNominationPrimary(world, {
      ...f.field,
      plan: f.plan,
      seatKey: "action-seat",
      title: "Recorded-choice primary",
      involvedEntityIds: f.field.entrants.map((e) => e.personId),
      partyShare: () => {
        throw new Error("No affiliation or party-share vote");
      },
    });
    expect(
      recordedPrimaryBallotSelectionAt(held, {
        ...f.field,
        electionStableKey: f.field.stableKey,
        personId: f.voter,
      }),
    ).toBe("party-a");
    const traces = held.history.decisionTraces.filter(
      (row) => row.context.decisionType === "election.primary-ballot-choice",
    );
    expect(traces).toHaveLength(1);
    expect(traces[0]!.context.actorPersonId).toBe(f.voter);
    expect(traces[0]!.context.considerations[0]!.sourceRefs[0]!.kind).toBe(
      "private-belief",
    );
    expect(
      held.history.events.filter(
        (row) => row.type === "election.party-registration",
      ),
    ).toHaveLength(0);
    const primary = nominationPrimaryRecord(held, f.field.stableKey)!;
    expect(primary.participants[0]!.detail).toBe("party-a|1000|nominated");
    const reopened = deserializeWorld(serializeWorld(held));
    expect(considerPrimaryPartyBallots(reopened, f.field)).toBe(reopened);
    expect(
      recordedPrimaryBallotSelectionAt(reopened, {
        ...f.field,
        electionStableKey: f.field.stableKey,
        personId: f.voter,
      }),
    ).toBe("party-a");
  });

  it("a clock step crossing primary day records the dated NPC decision without allowing a late player choice", () => {
    const f = setup("Open", "a114-crossed-primary-date");
    const after = advanceWorld(
      support(f.world, f.voter, f.field.entrants[0]!.personId),
      1,
    );
    expect(
      choosePrimaryPartyBallot(after, {
        ...f.field,
        personId: f.voter,
        selectedPartyId: "party-a",
      }),
    ).toBe(after);
    const held = considerPrimaryPartyBallots(after, f.field);
    const choice = held.history.events.find(
      (event) => event.type === "election.primary-ballot-selection",
    );
    expect(choice?.occurredAt).toBe(f.field.electionDate);
    expect(choice?.recordedAt).toBe(after.currentDate);
    expect(
      recordedPrimaryBallotSelectionAt(held, {
        ...f.field,
        electionStableKey: f.field.stableKey,
        personId: f.voter,
      }),
    ).toBe("party-a");
    expect(considerPrimaryPartyBallots(held, f.field)).toBe(held);
  });

  it("keeps a resolved unopposed group when another party has no admitted count", () => {
    const f = setup("Open", "a114-partial-field-preserved");
    const unopposed = f.secondVoter;
    const held = holdNominationPrimary(f.world, {
      ...f.field,
      plan: f.plan,
      seatKey: "partial-action-seat",
      title: "Partially resolved field",
      involvedEntityIds: f.field.entrants.map((row) => row.personId),
      entrants: [
        ...f.field.entrants,
        {
          personId: unopposed,
          party: "party-b",
          incumbent: false,
          partyBacked: false,
        },
      ],
      partyShare: () => null,
    });
    const record = nominationPrimaryRecord(held, f.field.stableKey)!;
    expect(record.tags).toContain("pending-party:party-a");
    expect(record.participants.map((row) => row.personId)).toEqual([unopposed]);
    expect(nominationNominees(held, f.field.stableKey)).toEqual([
      { personId: unopposed, party: "party-b" },
    ]);
    expect(
      holdNominationPrimary(held, {
        ...f.field,
        plan: f.plan,
        seatKey: "partial-action-seat",
        title: "Partially resolved field",
        involvedEntityIds: [],
        partyShare: () => null,
      }),
    ).toBe(held);
  });

  it("missing views and tied candidate views produce no invented ballot or trace", () => {
    const f = setup("Open", "a114-no-invented-choice");
    expect(considerPrimaryPartyBallots(f.world, f.field)).toBe(f.world);
    const world = support(
      support(f.world, f.voter, f.field.entrants[0]!.personId),
      f.voter,
      f.field.entrants[1]!.personId,
    );
    expect(considerPrimaryPartyBallots(world, f.field)).toBe(world);
  });

  it("a controlled person's ballot stays explicit and uses existing jurisdiction eligibility", () => {
    const f = setup("Open", "a114-explicit-player-ballot");
    const world = {
      ...support(f.world, f.voter, f.field.entrants[0]!.personId),
      control: { kind: "person" as const, personId: f.voter },
    };
    expect(considerPrimaryPartyBallots(world, f.field)).toBe(world);
    const selected = choosePrimaryPartyBallot(world, {
      ...f.field,
      personId: f.voter,
      selectedPartyId: "party-a",
    });
    expect(selected).not.toBe(world);
    expect(
      choosePrimaryPartyBallot(selected, {
        ...f.field,
        personId: f.voter,
        selectedPartyId: "party-a",
      }),
    ).toBe(selected);
    expect(
      choosePrimaryPartyBallot(world, {
        ...f.field,
        personId: f.voter,
        selectedPartyId: "party-not-filed",
      }),
    ).toBe(world);
    const foreignPlace = drawRandomPlace(
      "a114-foreign-jurisdiction",
      (place) =>
        place.stateJurisdictionKey !== undefined &&
        place.stateJurisdictionKey !== `US-${f.field.stateUsps}`,
    );
    const foreign = stateJurisdictionForKey(
      foreignPlace.stateJurisdictionKey!,
    )!;
    const foreignWorld = {
      ...world,
      jurisdictions: { ...world.jurisdictions, [foreign.id]: foreign },
    };
    expect(
      isEligibleVoterIn(foreignWorld, f.voter, foreign.id, world.currentDate),
    ).toBe(false);
    expect(
      choosePrimaryPartyBallot(foreignWorld, {
        ...f.field,
        jurisdictionId: foreign.id,
        personId: f.voter,
        selectedPartyId: "party-a",
      }),
    ).toBe(foreignWorld);
  });

  it("closed access does not turn a preference into registration; actual enrollment unlocks the same decision", () => {
    const f = setup("Closed", "a114-actual-closed-enrollment");
    let world = support(f.world, f.voter, f.field.entrants[0]!.personId);
    expect(considerPrimaryPartyBallots(world, f.field)).toBe(world);
    expect(
      choosePrimaryPartyBallot(world, {
        ...f.field,
        personId: f.voter,
        selectedPartyId: "party-a",
      }),
    ).toBe(world);
    world = recordPrimaryPartyRegistration(world, {
      stableKey: "actual-enrollment-receipt",
      personId: f.voter,
      jurisdictionId: f.field.jurisdictionId,
      registeredPartyId: "party-a",
    });
    const chosen = considerPrimaryPartyBallots(world, f.field);
    expect(
      recordedPrimaryBallotSelectionAt(chosen, {
        ...f.field,
        electionStableKey: f.field.stableKey,
        personId: f.voter,
      }),
    ).toBe("party-a");
  });

  it("a partially closed category does not manufacture its missing party authorization or invitation", () => {
    const f = setup("Partially closed", "a114-invitation-fact-absent");
    const world = support(f.world, f.voter, f.field.entrants[0]!.personId);
    expect(considerPrimaryPartyBallots(world, f.field)).toBe(world);
    expect(
      choosePrimaryPartyBallot(world, {
        ...f.field,
        personId: f.voter,
        selectedPartyId: "party-a",
      }),
    ).toBe(world);
  });
});
