import { legacyPolicyMemberBallot } from "../../../tests/fixtures/a79-legacy-policy-ballot";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  constitutionalActions,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
} from "../constitutional-process";
import { addDays } from "../dates";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { createFormationContext, recordPrinciples } from "../politics";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { DecisionConsideration, EntityId, World } from "../types";
import { articleVProposalBallots, repeatsLastRejection } from "./article-v";
import * as chamber from "./chamber-votes";
import { seatedCongressChamber } from "./congress-chambers";

const seed = "A79-recorded-constitutional-chamber";
const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
})[0]!;
let world: World;
let measureId: EntityId;
let propositionId: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  world = ensureNationalElectionJurisdiction(game.world);
  propositionId = world.policyCatalog.propositionOrder.find((id) => {
    const proposition = world.policyCatalog.propositions[id]!;
    const bearings = proposition.principles ?? [];
    return (
      world.policyCatalog.issues[proposition.issueId]?.levels?.includes(
        "federal",
      ) &&
      bearings.length > 0 &&
      new Set(bearings.map((bearing) => bearing.principleId)).size ===
        bearings.length
    );
  })!;
  expect(propositionId).toBeDefined();
  const member = seatedCongressChamber(world, "house")!.body.members.find(
    (row) => row.personId !== null,
  )!;
  // Supplied strong views on a real seated person, not an invented member.
  world = recordPrinciples(
    world,
    world.policyCatalog.propositions[propositionId]!.principles!.map(
      (bearing) => ({
        stableKey: `a79:supplied-view:${member.personId}:${bearing.principleId}`,
        personId: member.personId!,
        principleId: bearing.principleId,
        formedAt: world.currentDate,
        stance: bearing.bearing === "consistent-with" ? "endorses" : "rejects",
        strength: 1,
        conviction: "settled",
        flexibility: "firm",
        qualification: null,
        formation: createFormationContext("other:drawn-before-play", {
          note: "Supplied non-neutral A79 comparison views, not simulated persuasion.",
        }),
        supersedesPrincipleRecordId:
          world.history.principles
            .filter(
              (row) =>
                row.personId === member.personId &&
                row.principleId === bearing.principleId,
            )
            .at(-1)?.id ?? null,
      }),
    ),
  );
  world = proposeConstitutionalMeasure(world, {
    stableKey: "a79:recorded-congressional-policy-proposal",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    jurisdictionKey: "US",
    processKind: "federal-amendment",
    designation: "Supplied A79 Congressional Amendment",
    shortTitle: world.policyCatalog.propositions[propositionId]!.name,
    text: "The supplied catalog policy becomes constitutional law.",
    textVersion: "v1",
    sponsoringAuthority: "The Congress of the United States",
    sponsorPersonId: null,
    ratificationMode: "state-legislatures",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: { kind: "policy-provision", propositionId, stance: "adopt" },
    ordinaryMeasureId: null,
  });
  measureId = world.history.constitutionalMeasures!.at(-1)!.id;
});

function input(bodyKey: "house" | "senate" = "house") {
  return {
    kind: "constitutional" as const,
    stableKey: "a79:actual-constitutional-vote",
    constitutionalMeasureId: measureId,
    bodyKey,
    purpose: "proposal" as const,
    members: seatedCongressChamber(world, bodyKey)!.body.members.filter(
      (row) => row.personId !== null,
    ),
    considerationsByMember: new Map<string, readonly DecisionConsideration[]>(),
  };
}

describe("A79 recorded constitutional proposal uses the shared chamber vote", () => {
  it.each(["house", "senate"] as const)(
    "compares non-neutral old and shared decisions for the actual %s",
    (bodyKey) => {
      const members = input(bodyKey).members;
      const old = members.map((member) =>
        legacyPolicyMemberBallot(
          world,
          `a79:comparison:${member.memberKey}`,
          member.personId!,
          propositionId,
        ),
      );
      const spy = vi.spyOn(chamber, "decideChamberVote");
      try {
        const actual = articleVProposalBallots(world, measureId, bodyKey);
        expect(spy).toHaveBeenCalledOnce();
        expect(spy.mock.calls[0]![1]).toMatchObject({
          kind: "constitutional",
          constitutionalMeasureId: measureId,
          bodyKey,
          purpose: "proposal",
        });
        expect(actual).toHaveLength(members.length);
        let changed = 0;
        for (let index = 0; index < members.length; index++) {
          const before = old[index]!.ballot;
          const after = actual[index]!.disposition;
          if (before === after) continue;
          changed++;
          // The intended difference is withholding an unanswered vote.
          expect({ before, after }).toEqual({
            before: "nay",
            after: "present-not-voting",
          });
        }
        if (bodyKey === "house")
          expect(old.some((row) => row.ballot === "yea")).toBe(true);
        console.info(
          "A79 comparison receipt",
          JSON.stringify({
            seed,
            state: state.jurisdictionKey,
            place: place.displayName,
            measureId,
            question: world.policyCatalog.propositions[propositionId]!.name,
            bodyKey,
            voters: members.length,
            changed,
            example: members[0]!.name,
            before: old[0]!.ballot,
            after: actual[0]!.disposition,
          }),
        );
        expect(
          articleVProposalBallots(
            deserializeWorld(serializeWorld(world)),
            measureId,
            bodyKey,
          ),
        ).toEqual(actual);
      } finally {
        spy.mockRestore();
      }
    },
  );

  it("preserves present-not-voting, player absence and the recorded threshold", () => {
    const base = input();
    const player = base.members[0]!.personId!;
    const votes = chamber.decideChamberVote(world, {
      ...base,
      playerPersonId: player,
    });
    expect(votes[0]!.disposition).toBe("absent");
    expect(
      votes.slice(1).every((vote) => vote.disposition === "present-not-voting"),
    ).toBe(true);
    const saved = recordConstitutionalProposalVote(
      world,
      measureId,
      "house",
      votes,
      base.members.length,
      {
        method: "member-decisions",
        note: "Actual saved seats; supplied empty considerations preserve unanswered votes.",
        sourceEntityIds: [],
      },
    );
    const action = constitutionalActions(saved, measureId).at(-1)!;
    if (action.detail.kind !== "proposal-vote")
      throw new Error("The rollcall was not recorded.");
    expect(action.detail.vote.tally.presentNotVoting).toBe(
      base.members.length - 1,
    );
    expect(action.detail.vote.tally.nay).toBe(0);
    expect(action.detail.vote.denominatorValue).toBe(base.members.length - 1);
    expect(action.detail.vote.requiredVotes).toBe(
      Math.ceil(((base.members.length - 1) * 2) / 3),
    );
    expect(saved.history.constitutionalMeasures!.at(-1)!.proposalRule).toEqual(
      world.history.constitutionalMeasures!.at(-1)!.proposalRule,
    );
    expect(serializeWorld(deserializeWorld(serializeWorld(saved)))).toBe(
      serializeWorld(saved),
    );
  });

  it("compares repeat proposals against the actual saved rejected rollcall", () => {
    const members = input().members;
    const saved = recordConstitutionalProposalVote(
      world,
      measureId,
      "house",
      articleVProposalBallots(world, measureId, "house"),
      members.length,
      {
        method: "member-decisions",
        note: "The actual proposal vote, not an invented forecast subject.",
        sourceEntityIds: [],
      },
    );
    const voters = {
      house: input().members.map((member) => ({
        memberKey: member.memberKey,
        personId: member.personId!,
      })),
      senate: input("senate").members.map((member) => ({
        memberKey: member.memberKey,
        personId: member.personId!,
      })),
    };
    expect(repeatsLastRejection(saved, propositionId, voters)).toBe(true);
    expect(
      repeatsLastRejection(
        deserializeWorld(serializeWorld(saved)),
        propositionId,
        voters,
      ),
    ).toBe(true);
    expect(
      repeatsLastRejection(
        {
          ...saved,
          control: { kind: "person", personId: members[0]!.personId! },
        },
        propositionId,
        voters,
      ),
    ).toBe(false);
  });

  it("accepts only an actual dated proposal and matching saved body members", () => {
    const base = input();
    expect(() =>
      chamber.decideChamberVote(world, {
        ...base,
        constitutionalMeasureId: world.history.events[0]!.id,
      }),
    ).toThrow(/actual dated congressional proposal/);
    expect(() =>
      chamber.decideChamberVote(
        { ...world, currentDate: addDays(world.currentDate, -1) },
        base,
      ),
    ).toThrow(/actual dated congressional proposal/);
    expect(() =>
      chamber.decideChamberVote(world, {
        ...base,
        members: input("senate").members,
      }),
    ).toThrow(/actual dated congressional proposal/);
    expect(() =>
      chamber.decideChamberVote(world, {
        ...base,
        members: [base.members[0]!, base.members[0]!],
      }),
    ).toThrow(/actual dated congressional proposal/);
    expect(() =>
      chamber.decideChamberVote(world, {
        ...base,
        purpose: "ratification" as "proposal",
      }),
    ).toThrow(/actual dated congressional proposal/);
  });
});
