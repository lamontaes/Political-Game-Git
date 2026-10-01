import { beforeAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalActions,
  constitutionalPosition,
} from "../constitutional-process";
import { currentPresidentOf } from "../crisis/offices";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import { ensureNationalElectionJurisdiction } from "../national-election-geography";
import { createOrganizationParticipations } from "../life";
import { personName } from "../people";
import { LIVING_WORLD_KEYS, livingWorldOrganizationId } from "./opening";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import * as chamber from "../governing/chamber-votes";
import { congressVoters } from "../governing/article-v";
import {
  proposeAndVote,
  decideArticleVStateMemberVotes,
  termLimitBallot,
  termLimitCount,
  type FederalReformCause,
} from "./federal-reform";

const seed = "A79-recorded-term-limit-chamber";
const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
})[0]!;
let world: World;
let cause: FederalReformCause;
beforeAll(() => {
  // The opening's national offices and Congress, not its households or town.
  world = ensureNationalElectionJurisdiction(
    smallWorld({ place: place.key, seed, offices: ["congress"] }).world,
  );
  cause = {
    direction: "extend",
    holderPersonId: currentPresidentOf(world)!.personId,
    value: {
      maxConsecutiveTerms: null,
      maxLifetimeTerms: 3,
      lookbackYears: null,
    },
    reason:
      "Supplied term-limit comparison on the actual President, not a natural filing cause.",
  };
  // Authored non-neutral affiliation inputs on actual saved people and parties.
  // This does not claim their party affiliations emerged from a played year.
  const affiliations = [
    { personId: cause.holderPersonId, party: "democratic" },
    ...(["house", "senate"] as const).flatMap((body) =>
      congressVoters(world, body)
        .slice(0, 2)
        .map((voter, index) => ({
          personId: voter.personId,
          party: index === 0 ? "democratic" : "republican",
        })),
    ),
  ];
  world = createOrganizationParticipations(
    world,
    affiliations.map(({ personId, party }) => ({
      stableKey: `a79:supplied-party:${personId}`,
      personId,
      organizationId: livingWorldOrganizationId(
        world,
        LIVING_WORLD_KEYS.nationalParty(party),
      ),
      startedAt: world.currentDate,
      initialStatus: "active",
      kind: "affiliation:political-party",
      roleKind: "member:public-affiliation",
      context: "Supplied non-neutral A79 term-limit comparison affiliation.",
      provenance: {
        kind: "authored",
        note: "Same supplied party inputs in both old and shared arms.",
      },
    })),
  );
});

describe("A79 recorded presidential term-limit proposal uses the shared chamber", () => {
  it.each(["extend", "restore"] as const)(
    "preserves old non-neutral %s ballots for the same actual members",
    (direction) => {
      const input = { ...cause, direction };
      const spy = vi.spyOn(chamber, "decideChamberVote");
      try {
        const count = termLimitCount(world, 2027, input);
        expect(spy).toHaveBeenCalledTimes(2);
        expect(world.history.constitutionalMeasures ?? []).toHaveLength(0);
        expect(count.world.history.constitutionalMeasures).toHaveLength(1);
        for (const [recordedWorld, call] of spy.mock.calls) {
          expect(
            recordedWorld.history.constitutionalMeasures?.some(
              (row) => row.id === count.measureId,
            ),
          ).toBe(true);
          expect(call).toMatchObject({
            kind: "constitutional",
            constitutionalMeasureId: count.measureId,
            purpose: "proposal",
          });
        }
        for (const house of count.houses) {
          const old = congressVoters(world, house.bodyKey).map((voter) =>
            termLimitBallot(world, `old:${voter.memberKey}`, voter, input),
          );
          expect(house.rows.map((row) => row.ballot)).toEqual(
            old.map((row) => row.ballot),
          );
          expect(house.rows.map((row) => row.reason)).toEqual(
            old.map((row) => row.reason),
          );
          expect(new Set(old.map((row) => row.ballot))).toEqual(
            new Set(["yea", "nay"]),
          );
          expect(house.rows.map((row) => row.voter)).toEqual(
            congressVoters(world, house.bodyKey),
          );
          expect(
            house.rows.every((row) => row.reason.startsWith("member:")),
          ).toBe(true);
          const voter = house.rows[0]!;
          const person = world.people[voter.voter.personId]!;
          console.info(
            "A79 term-limit comparison",
            JSON.stringify({
              seed,
              state: state.jurisdictionKey,
              place: place.displayName,
              direction,
              body: house.bodyKey,
              voters: old.length,
              changed: 0,
              example: personName(person),
              before: old[0]!.ballot,
              after: voter.ballot,
              measureId: count.measureId,
            }),
          );
        }
      } finally {
        spy.mockRestore();
      }
    },
  );

  it("retains the real rejection rollcall and its IDs across repeat and Save/Continue", () => {
    const result = proposeAndVote(world, 2027, cause);
    const measure = result.history.constitutionalMeasures!.at(-1)!;
    const actions = constitutionalActions(result, measure.id);
    expect(actions.length).toBeGreaterThan(0);
    expect(
      actions.filter((row) => row.detail.kind === "proposal-vote"),
    ).toHaveLength(1);
    expect(constitutionalPosition(result, measure.id).phase).toBe("rejected");
    expect(
      result.history.futureDueItems.filter(
        (row) => row.transitionKey === "governing:federal-reform-state-action",
      ),
    ).toHaveLength(0);
    expect(proposeAndVote(result, 2027, cause)).toBe(result);
    const loaded = deserializeWorld(serializeWorld(result));
    expect(constitutionalActions(loaded, measure.id)).toEqual(actions);
    expect(proposeAndVote(loaded, 2027, cause)).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(serializeWorld(result));
  });

  it("records both successful chambers before scheduling the existing state actions", () => {
    const members = (["house", "senate"] as const).flatMap((body) =>
      congressVoters(world, body),
    );
    const supported = createOrganizationParticipations(
      world,
      members
        .filter(
          (voter) => chamber.publicPartyOf(world, voter.personId) === null,
        )
        .map((voter) => ({
          stableKey: `a79:supplied-support:${voter.memberKey}`,
          personId: voter.personId,
          organizationId: livingWorldOrganizationId(
            world,
            LIVING_WORLD_KEYS.nationalParty("democratic"),
          ),
          startedAt: world.currentDate,
          initialStatus: "active",
          kind: "affiliation:political-party",
          roleKind: "member:public-affiliation",
          context: "Supplied supportive affiliation on an actual saved member.",
          provenance: {
            kind: "authored",
            note: "Successful rollcall fixture, not natural political persuasion.",
          },
        })),
    );
    const count = termLimitCount(supported, 2027, cause);
    expect(count.carries).toBe(true);
    const result = proposeAndVote(supported, 2027, cause);
    const measure = result.history.constitutionalMeasures!.at(-1)!;
    const votes = constitutionalActions(result, measure.id).filter(
      (row) => row.detail.kind === "proposal-vote",
    );
    expect(votes).toHaveLength(2);
    expect(constitutionalPosition(result, measure.id).phase).toBe(
      "ratification",
    );
    expect(measure.ruleDelta).toEqual(
      count.world.history.constitutionalMeasures!.at(-1)!.ruleDelta,
    );
    const due = result.history.futureDueItems.filter(
      (row) => row.transitionKey === "governing:federal-reform-state-action",
    );
    expect(due).toHaveLength(50);
    expect(proposeAndVote(result, 2027, cause)).toBe(result);
    const loaded = deserializeWorld(serializeWorld(result));
    expect(
      loaded.history.futureDueItems.filter(
        (row) => row.transitionKey === "governing:federal-reform-state-action",
      ),
    ).toEqual(due);
    expect(proposeAndVote(loaded, 2027, cause)).toBe(loaded);

    // A supplied successful federal proposal; the state body is produced by
    // its ordinary saved legislature opening, not a congressional proxy.
    const jurisdiction = stateJurisdictionForKey("US-NE")!;
    if (result.control.kind !== "person")
      throw Error("The fixture must retain its actual controlled person.");
    const at = ensureStateLegislatureOpening(
      result,
      result.control.personId,
      "NE",
    );
    const spy = vi.spyOn(chamber, "decideChamberVote");
    let stateVotes: ReturnType<typeof decideArticleVStateMemberVotes>;
    try {
      stateVotes = decideArticleVStateMemberVotes(
        at,
        measure.id,
        jurisdiction.id,
      );
      expect(stateVotes).not.toBeNull();
      expect(spy).toHaveBeenCalledTimes(stateVotes!.chambers.length);
      expect(stateVotes!.chambers).toHaveLength(1);
      for (const [voteWorld, input] of spy.mock.calls) {
        expect(input).toMatchObject({
          kind: "constitutional",
          purpose: "ratification",
          constitutionalMeasureId: measure.id,
          ratificationJurisdictionId: jurisdiction.id,
        });
        const roster = chamber.stateConstitutionalRoster(
          voteWorld,
          jurisdiction.id,
          (input as chamber.ChamberConstitutionalVoteInput).bodyKey,
        )!;
        expect(input.members).toEqual(roster.seated.body.members);
      }
    } finally {
      spy.mockRestore();
    }
    for (const body of stateVotes!.chambers) {
      expect(body.dispositions).toHaveLength(body.eligibleMembers);
      expect(body.sourceRecordIds).toContain(measure.id);
      for (const row of body.dispositions) {
        if (!row.personId) continue;
        const old = termLimitBallot(
          stateVotes!.world,
          `old:ratification:${row.memberKey}`,
          { memberKey: row.memberKey, personId: row.personId },
          cause,
        );
        expect(row.disposition).toBe(old.ballot);
        expect(row.reason).toBe(old.reason);
      }
    }
    const reloaded = deserializeWorld(serializeWorld(stateVotes!.world));
    expect(
      decideArticleVStateMemberVotes(reloaded, measure.id, jurisdiction.id)
        ?.chambers,
    ).toEqual(stateVotes!.chambers);
    // Ballots cannot imply state approval without a sourced ratification rule.
    expect(
      constitutionalActions(stateVotes!.world, measure.id).filter(
        (action) => action.detail.kind === "state-ratification",
      ),
    ).toHaveLength(0);
    // Deliberately incomplete identity input, never saved as a valid world.
    // The federal delegation remains present and must not replace this body.
    const missingBody: World = {
      ...at,
      history: {
        ...at.history,
        ruleChangeConsequenceBindings:
          at.history.ruleChangeConsequenceBindings?.filter(
            (row) => row.jurisdictionId !== jurisdiction.id,
          ),
      },
    };
    expect(
      decideArticleVStateMemberVotes(missingBody, measure.id, jurisdiction.id),
    ).toBeNull();
    const body = stateVotes!.chambers[0]!;
    const member = body.dispositions.find((row) => row.personId)!;
    const controlled: World = {
      ...stateVotes!.world,
      control: { kind: "person", personId: member.personId! },
    };
    expect(
      decideArticleVStateMemberVotes(
        controlled,
        measure.id,
        jurisdiction.id,
      )?.chambers[0]?.dispositions.find(
        (row) => row.memberKey === member.memberKey,
      ),
    ).toMatchObject({
      disposition: "absent",
      reason: "member:player-not-present",
    });
    expect(() =>
      chamber.decideChamberVote(stateVotes!.world, {
        kind: "constitutional",
        stableKey: "a79:invalid-congressional-proxy",
        constitutionalMeasureId: measure.id,
        purpose: "ratification",
        ratificationJurisdictionId: jurisdiction.id,
        bodyKey: body.bodyKey,
        members: congressVoters(stateVotes!.world, "house").map((voter) => ({
          ...voter,
          name: personName(stateVotes!.world.people[voter.personId]!),
          caucusLabel: "",
        })),
        considerationsByMember: new Map(),
      }),
    ).toThrow(/dated state body and seated members/);
    console.info(
      "A79 state ratification member comparison",
      JSON.stringify({
        seed,
        startingPlace: place.displayName,
        ratifyingState: "US-NE",
        body: body.bodyKey,
        compared: body.dispositions.length,
        changed: 0,
        example: personName(stateVotes!.world.people[member.personId!]!),
        ballot: member.disposition,
        reason: member.reason,
        measureId: measure.id,
        stateApproval: "NOT DERIVED: sourced ratification rules missing",
      }),
    );
    let statesWithActualBallots = 0;
    let ineligiblePlaces = 0;
    let comparedStateMembers = 0;
    const unsupportedStateBodies: string[] = [];
    for (const identity of lifePlaceStateIdentities()) {
      const stateJurisdiction = stateJurisdictionForKey(
        identity.jurisdictionKey,
      )!;
      const ballots = decideArticleVStateMemberVotes(
        stateVotes!.world,
        measure.id,
        stateJurisdiction.id,
      );
      if (!ARTICLE_V_STATE_KEYS.includes(identity.jurisdictionKey)) {
        expect(ballots).toBeNull();
        ineligiblePlaces += 1;
        continue;
      }
      if (!ballots) {
        unsupportedStateBodies.push(identity.jurisdictionKey);
        continue;
      }
      statesWithActualBallots += 1;
      for (const chamberVotes of ballots!.chambers) {
        expect(chamberVotes.dispositions).toHaveLength(
          chamberVotes.eligibleMembers,
        );
        for (const row of chamberVotes.dispositions) {
          if (!row.personId) continue;
          const old = termLimitBallot(
            ballots!.world,
            `old:state:${row.memberKey}`,
            { memberKey: row.memberKey, personId: row.personId },
            cause,
          );
          expect(row.disposition).toBe(old.ballot);
          expect(row.reason).toBe(old.reason);
          comparedStateMembers += 1;
        }
      }
    }
    console.info(
      "A79 all starting jurisdictions member comparison",
      JSON.stringify({
        seed,
        statesWithActualBallots,
        ineligiblePlaces,
        comparedStateMembers,
        unsupportedStateBodies,
        changed: 0,
        stateApprovalsDerived: 0,
      }),
    );
    expect(unsupportedStateBodies).toEqual([]);
    expect(statesWithActualBallots).toBe(50);
    expect(ineligiblePlaces).toBe(6);
  });

  it("preserves a controlled member's absence and never votes for the player", () => {
    const voter = congressVoters(world, "house")[0]!;
    const controlled: World = {
      ...world,
      control: { kind: "person", personId: voter.personId },
    };
    const old = termLimitBallot(controlled, "old:player", voter, cause);
    const count = termLimitCount(controlled, 2027, cause);
    expect(old.ballot).toBe("absent");
    expect(
      count.houses[0]!.rows.find(
        (row) => row.voter.memberKey === voter.memberKey,
      ),
    ).toMatchObject({ ballot: "absent", reason: "member:player-not-present" });
  });
});
