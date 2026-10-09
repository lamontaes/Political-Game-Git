import { describe, expect, it } from "vitest";
import { createCharacterHistoryContextPeople } from "../character-history";
import { createWorld } from "../world";
import { makeIsoDate } from "../dates";
import { createProductionPolicyCatalog } from "../production-catalog";
import { searchLifePlaces, stateJurisdictionForKey } from "../life-places";
import { STATES } from "../state-reference";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { countRecordedVoterBallots } from "../election-contests";
import { researchRuleTable } from "../research-rule-tables";
import {
  holdNominationPrimary,
  nominationNominees,
  nominationPrimaryRecord,
} from "../nominations/party-nominations";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import {
  registerNationalElection,
  nationalRecords,
} from "../national-elections";
import { nationalElectionRules } from "../national-election-rules";
import {
  presidentialElectionDayHandler,
  PRESIDENTIAL_ELECTION_DAY,
} from "./presidential-turnover";
import {
  scheduleFutureDueItem,
  createFutureTransitionHandlerRegistry,
} from "../future-transitions";
import { advanceWorld } from "../world";
import { serializeWorld, deserializeWorld } from "../serialization";
import { candidacyEligibility } from "../candidacy";
import type { World, EntityId } from "../types";

function residents(code: string, seed: string): World {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${code}`,
    scope: "locality",
  })[0]!;
  const state = stateJurisdictionForKey(`US-${code}`)!;
  let world = createWorld({
    seed,
    currentDate: makeIsoDate("2028-11-06"),
    currentMoment: {
      ...place.context.initialMoment,
      date: makeIsoDate("2028-11-06"),
    },
    people: [],
    jurisdictions: [place.context.jurisdiction, state],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createCharacterHistoryContextPeople(
    world,
    Array.from({ length: 6 }, (_, index) => ({
      stableKey: `p2-f:resident:${index}`,
      givenName: "Recorded",
      familyName: `Resident ${index}`,
      birthDate: makeIsoDate("1970-01-01"),
      homeJurisdictionId: place.context.jurisdiction.id,
      birthplaceJurisdictionId: place.context.jurisdiction.id,
    })),
  );
  return world;
}
function favor(
  world: World,
  voters: readonly EntityId[],
  candidateIds: readonly EntityId[],
  preferred: EntityId,
): World {
  let next = world;
  for (const personId of voters)
    for (const candidateId of candidateIds)
      next = recordPrivateBelief(next, {
        stableKey: `p2-f:${personId}:${candidateId}:${preferred}`,
        personId,
        propositionId: null,
        subject: { kind: "official", personId: candidateId },
        formedAt: world.currentDate,
        position: candidateId === preferred ? "support" : "oppose",
        conviction: "strong",
        salience: "central",
        flexibility: "firm",
        rationale: "Recorded candidate view in a controlled ballot fixture.",
        formation: createFormationContext("reflection:initial"),
        supersedesBeliefId: null,
      });
  return next;
}

describe("P2-f presidential votes read residents, not a prior national share", () => {
  it.each(Object.keys(STATES))(
    "records a ticket's explicit residence identity in %s independently of elector allocation",
    (code) => {
      const world = ensureNationalElectionJurisdiction(
        residents(code, `p2-f:ticket-residence:${code}`),
      );
      const [presidentPersonId, vicePresidentPersonId] = world.personOrder;
      const registered = registerNationalElection(world, {
        stableKey: "p2-f:ticket-identity",
        cycle: 2028,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        tickets: [
          {
            presidentPersonId: presidentPersonId!,
            vicePresidentPersonId: vicePresidentPersonId!,
            presidentState: code,
            vicePresidentState: code,
          },
        ],
        provenance: {
          method: "authored",
          sourceEntityIds: [presidentPersonId!, vicePresidentPersonId!],
          note: "Controlled residence-identity admission; candidate qualifications are tested separately.",
        },
      });
      expect(
        registered.history.nationalElections!.at(-1)!.tickets[0],
      ).toMatchObject({ presidentState: code, vicePresidentState: code });
      expect(registered.personOrder).toEqual(world.personOrder);
    },
  );
  it.each(Object.keys(STATES))(
    "counts recorded challenger views in %s identically across starting seeds",
    (code) => {
      const totals: number[][] = [];
      for (const seed of ["p2-f:one", "p2-f:two"]) {
        let world = residents(code, seed);
        const [incumbent, challenger] = world.personOrder;
        const voters = world.personOrder.slice(2);
        world = favor(world, voters, [incumbent!, challenger!], challenger!);
        const counted = countRecordedVoterBallots(world, {
          stableKey: "p2-f:president",
          jurisdictionId: stateJurisdictionForKey(`US-${code}`)!.id,
          electionDate: world.currentDate,
          candidatePersonIds: [incumbent!, challenger!],
        });
        expect(counted?.winnerPersonId, `${code}; ${seed}`).toBe(challenger);
        expect(counted?.ballots.map((x) => x.voterPersonId)).toEqual(
          world.personOrder,
        );
        expect(
          counted?.ballots
            .filter((x) => x.candidatePersonId !== null)
            .every((x) => x.sourceBeliefIds.length === 2),
        ).toBe(true);
        expect(
          counted?.ballots
            .filter((x) => x.candidatePersonId === null)
            .map((x) => x.voterPersonId),
        ).toEqual([incumbent, challenger]);
        totals.push(counted!.tallies.map((x) => x.votes));
      }
      expect(totals[0]).toEqual(totals[1]);
      const row =
        researchRuleTable("presidentialRules").places[
          code as keyof ReturnType<
            typeof researchRuleTable<"presidentialRules">
          >["places"]
        ];
      expect(row.reason.trim().length).toBeGreaterThan(0);
      expect(
        nationalElectionRules(2028).units.some((unit) => unit.state === code),
      ).toBe(row.popularElection);
    },
  );

  it("the shared primary returns the actual recorded voter winner and retains source people", () => {
    let world = residents(Object.keys(STATES)[0]!, "p2-f:primary");
    const [a, b] = world.personOrder;
    const voters = world.personOrder.slice(2);
    world = favor(world, voters, [a!, b!], b!);
    world = holdNominationPrimary(world, {
      stableKey: "p2-f:field",
      seatKey: "us-president",
      title: "President",
      jurisdictionId: world.jurisdictionOrder[0]!,
      involvedEntityIds: [a!, b!],
      entrants: [
        {
          personId: a!,
          party: "recorded-party",
          incumbent: true,
          partyBacked: true,
        },
        {
          personId: b!,
          party: "recorded-party",
          incumbent: false,
          partyBacked: false,
        },
      ],
      partyShare: () => null,
      plan: {
        known: true,
        stateUsps: "US",
        family: "us-president",
        year: 2028,
        method: "party-primary",
        primaryDate: world.currentDate,
        dateBasis: "estimated-from-average",
        estimated: ["primary-date"],
        runoff: null,
        advance: 1,
        filingDeadline: world.currentDate,
        filingBasis: "estimated-from-average",
      },
      recordedVoters: {
        jurisdictionIds: [world.jurisdictionOrder[0]!],
        admitVoter: (personId) => voters.includes(personId),
      },
    });
    expect(nominationNominees(world, "p2-f:field")).toEqual([
      { personId: b, party: "recorded-party" },
    ]);
    expect(nominationPrimaryRecord(world, "p2-f:field")?.tags).toContain(
      "count:recorded-voters",
    );
    for (const voter of voters)
      expect(
        nominationPrimaryRecord(world, "p2-f:field")?.involvedEntityIds,
      ).toContain(voter);
    expect(
      nominationNominees(deserializeWorld(serializeWorld(world)), "p2-f:field"),
    ).toEqual(nominationNominees(world, "p2-f:field"));
  });

  it("the actual election-day due item counts the recorded people and reopens without a second count", () => {
    const code = Object.keys(STATES).find(
      (code) => STATES[code]!.electorAllocation === "winner-take-all",
    )!;
    let world = residents(code, "p2-f:due");
    const [a, av, b, bv] = world.personOrder;
    world = favor(
      world,
      world.personOrder.filter((id) => id !== a && id !== b),
      [a!, b!],
      b!,
    );
    world = registerNationalElection(
      ensureNationalElectionJurisdiction(world),
      {
        stableKey: "p2-f:national",
        cycle: 2028,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        tickets: [
          {
            presidentPersonId: a!,
            vicePresidentPersonId: av!,
            presidentState: code,
            vicePresidentState: code,
          },
          {
            presidentPersonId: b!,
            vicePresidentPersonId: bv!,
            presidentState: code,
            vicePresidentState: code,
          },
        ],
        provenance: {
          method: "authored",
          sourceEntityIds: [],
          note: "Recorded resident election fixture.",
        },
      },
    );
    const electionId = world.history.nationalElections!.at(-1)!.id;
    world = scheduleFutureDueItem(world, {
      stableKey: "presidential-turnover/v1:2028:p2-f:count",
      dueAt: nationalElectionRules(2028).electionDate,
      transitionKey: PRESIDENTIAL_ELECTION_DAY,
      entityIds: [electionId],
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      provenance: {
        kind: "authored",
        note: "Actual election-day due-item fixture.",
      },
    });
    const due = world.history.futureDueItems.at(-1)!;
    world = advanceWorld(
      world,
      1,
      createFutureTransitionHandlerRegistry([
        [PRESIDENTIAL_ELECTION_DAY, presidentialElectionDayHandler],
      ]),
    );
    const result = nationalRecords(world, electionId).find(
      (x) => x.kind === "unit-result" && x.unitKey === code,
    );
    expect(result?.kind).toBe("unit-result");
    if (result?.kind !== "unit-result") throw Error("Result absent");
    expect(result.allocationWinnerPersonId).toBe(b);
    expect(result.tallies.reduce((sum, x) => sum + x.votes, 0)).toBe(4);
    expect(result.provenance.sourceEntityIds).toEqual(
      [electionId, ...world.personOrder].sort(),
    );
    const reopened = deserializeWorld(serializeWorld(world));
    expect(nationalRecords(reopened, electionId)).toEqual(
      nationalRecords(world, electionId),
    );
    expect(
      serializeWorld(presidentialElectionDayHandler(reopened, due).world),
    ).toBe(serializeWorld(reopened));
    expect(
      nationalRecords(reopened, electionId).filter(
        (x) => x.kind === "unit-result",
      ),
    ).toHaveLength(nationalElectionRules(2028).units.length);
  });

  it.each(Object.keys(STATES))(
    "reads the sourced presidential age in the one eligibility gate for %s",
    (code) => {
      const world = residents(code, `p2-f:eligibility:${code}`);
      const result = candidacyEligibility(world, {
        personId: world.personOrder[0]!,
        jurisdictionId: world.jurisdictionOrder[0]!,
        officeKey: "us-president",
        alreadyACandidate: false,
      });
      expect(result.minimumAge).toEqual({
        value: researchRuleTable("presidentialRules").eligibility.minimumAge,
        estimated: false,
      });
      expect(result.office?.officeKey).toBe("us-president");
      expect(result.qualificationAssessments.map((x) => x.field)).toEqual([
        "MINIMUM_AGE",
        "US_CITIZENSHIP",
        "STATE_RESIDENCE",
      ]);
    },
  );
});
