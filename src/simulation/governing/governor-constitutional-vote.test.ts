import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { stateCandidacyPack } from "../candidacy-packs";
import {
  constitutionalActions,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  stateAmendmentProfile,
} from "../constitutional-process";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
  stateExecutiveOffice,
} from "../nationwide-world/state-executives";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { decideChamberVote, stateConstitutionalBody } from "./chamber-votes";
import {
  termLimitBallot,
  termLimitConsiderations,
} from "../living-world/federal-reform";
import { recordStateGovernorTermLimitProposalVotes } from "../living-world/constitutional-reform";

// Supplied proposal and cause on an actual generated governor and legislature.
// This is not an ordinary multi-year amendment or statewide ratification proof.
const seed = "A79-governor-actual-rollcall";
const identities = lifePlaceStateIdentities();
const supported = identities.filter(
  (identity) =>
    US_STATE_USPS.includes(
      identity.jurisdictionKey.slice(3) as (typeof US_STATE_USPS)[number],
    ) &&
    stateAmendmentProfile(identity.jurisdictionKey)?.basis === "game-profile" &&
    stateCandidacyPack(identity.jurisdictionKey) !== null,
);
const state = new SeededRng(seed).pick(supported);
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
})[0]!;
const jurisdiction = stateJurisdictionForKey(state.jurisdictionKey)!;
const governorReasons = {
  title: "governor",
  decisionType: "governing.governor-term-limit-vote",
  keyWord: "governor",
};
let world: World;
let playerId: EntityId;
let governorId: EntityId;
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
  playerId = game.playerPersonId;
  world = ensureStateLegislatureOpening(
    game.world,
    playerId,
    state.jurisdictionKey.slice(3),
  );
  world = ensureStateExecutiveIncumbent(
    world,
    playerId,
    state.jurisdictionKey.slice(3),
  );
  governorId = currentStateExecutiveHolders(world).find(
    (row) => row.stateUsps === state.jurisdictionKey.slice(3),
  )!.personId;
});
function proposal(direction: "extend" | "restore" = "restore") {
  const cause = {
    direction,
    holderPersonId: governorId,
    value: {
      maxConsecutiveTerms: direction === "restore" ? 2 : 4,
      maxLifetimeTerms: null,
      lookbackYears: null,
    },
    reason:
      "Supplied direction for unchanged governor-term-limit consideration parity.",
  };
  const next = proposeConstitutionalMeasure(world, {
    stableKey: `a79:actual-governor:${direction}`,
    jurisdictionId: jurisdiction.id,
    jurisdictionKey: `US-${state.jurisdictionKey.slice(3)}`,
    processKind: "state-amendment",
    designation: "Supplied Governor Amendment",
    shortTitle: "The governor's term limit",
    text: "Supplied term-limit change for the actual-member recording test.",
    textVersion: "v1",
    sponsoringAuthority: `The ${jurisdiction.name} Legislature`,
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "rule-field",
      officeKey: stateExecutiveOffice(state.jurisdictionKey.slice(3))!
        .officeKey,
      field: "executive.term.limit",
      value: cause.value,
      applicability: {
        appliesTo: "terms-beginning-after",
        countsPriorService: false,
      },
    },
    ordinaryMeasureId: null,
  });
  return {
    world: next,
    cause,
    measureId: next.history.constitutionalMeasures!.at(-1)!.id,
  };
}
function bodies(at: World, measureId: EntityId) {
  return stateAmendmentProfile(state.jurisdictionKey)!.bodies.map((body) => ({
    body,
    ...stateConstitutionalBody(at, measureId, body.bodyKey),
  }));
}
describe("A79 governor term-limit actual-member rollcall", () => {
  it("preserves both legacy directions for the same saved people and consideration weights", () => {
    let compared = 0;
    const examples: unknown[] = [];
    for (const direction of ["extend", "restore"] as const) {
      const fixture = proposal(direction);
      const tallies: {
        body: string;
        seats: number;
        yea: number;
        cast: number;
        example: string;
        ballot: string;
        reason: string | undefined;
      }[] = [];
      for (const { body, seated } of bodies(fixture.world, fixture.measureId)) {
        const rows = decideChamberVote(fixture.world, {
          kind: "constitutional",
          stableKey: `parity:${direction}`,
          constitutionalMeasureId: fixture.measureId,
          bodyKey: body.bodyKey,
          purpose: "proposal",
          members: seated.body.members,
          playerPersonId: playerId,
          considerationsByMember: new Map(
            seated.body.members.map((member) => [
              member.memberKey,
              member.personId
                ? termLimitConsiderations(
                    fixture.world,
                    { memberKey: member.memberKey, personId: member.personId },
                    fixture.cause,
                    governorReasons,
                  )
                : [],
            ]),
          ),
        });
        for (const row of rows) {
          expect(row.personId).not.toBeNull();
          const old = termLimitBallot(
            fixture.world,
            `old:${direction}:${row.memberKey}`,
            { memberKey: row.memberKey, personId: row.personId! },
            fixture.cause,
            governorReasons,
          );
          expect(row.disposition).toBe(old.ballot);
          expect(row.reason).toBe(old.reason);
          compared++;
        }
        tallies.push({
          body: body.bodyKey,
          seats: seated.seats,
          yea: rows.filter((row) => row.disposition === "yea").length,
          cast: rows.filter((row) => row.disposition !== "absent").length,
          example: seated.body.members[0]!.name,
          ballot: rows[0]!.disposition,
          reason: rows[0]!.reason,
        });
      }
      const totalYes = tallies.reduce((sum, row) => sum + row.yea, 0);
      const totalCast = tallies.reduce((sum, row) => sum + row.cast, 0);
      const comparison = tallies.map((row) => ({
        ...row,
        direction,
        oldProjectedYea: Math.round((row.seats * totalYes) / totalCast),
      }));
      expect(comparison.some((row) => row.oldProjectedYea !== row.yea)).toBe(
        true,
      );
      examples.push(...comparison);
    }
    console.info(
      "A79 governor parity",
      JSON.stringify({
        seed,
        place: place.displayName,
        state: state.jurisdictionKey,
        fullIdentityPool: identities.length,
        admittedPool: supported.length,
        governorId,
        compared,
        directionChanges: 0,
        examples,
      }),
    );
  });
  it("records actual chamber identities and unchanged terms instead of anonymous scaled seats", () => {
    const fixture = proposal();
    const saved = recordStateGovernorTermLimitProposalVotes(
      fixture.world,
      fixture.measureId,
      fixture.cause,
    );
    const actions = constitutionalActions(saved, fixture.measureId).filter(
      (row) => row.detail.kind === "proposal-vote",
    );
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      if (action.detail.kind !== "proposal-vote")
        throw Error("Rollcall missing.");
      const bodyKey = action.detail.bodyKey;
      const { seated, sourceRecordIds } = bodies(
        fixture.world,
        fixture.measureId,
      ).find((row) => row.body.bodyKey === bodyKey)!;
      expect(
        action.detail.vote.dispositions.map((row) => [
          row.memberKey,
          row.personId,
        ]),
      ).toEqual(
        seated.body.members.map((row) => [row.memberKey, row.personId]),
      );
      expect(action.detail.vote.eligibleMembers).toBe(seated.seats);
      expect(action.detail.vote.provenance.method).toBe("member-decisions");
      expect(action.detail.vote.provenance.sourceEntityIds).toEqual(
        expect.arrayContaining([...sourceRecordIds]),
      );
    }
    expect(saved.history.constitutionalMeasures).toEqual(
      fixture.world.history.constitutionalMeasures,
    );
    console.info(
      "A79 governor recorded",
      JSON.stringify({
        seed,
        measureId: fixture.measureId,
        phase: constitutionalPosition(saved, fixture.measureId).phase,
        bodies: actions.map((row) =>
          row.detail.kind === "proposal-vote"
            ? {
                body: row.detail.bodyKey,
                outcome: row.detail.vote.outcome,
                dispositions: row.detail.vote.dispositions.length,
              }
            : null,
        ),
      }),
    );
  });
  it("preserves the recorded rejection, repeat IDs and canonical Save/Continue", () => {
    const fixture = proposal();
    const saved = recordStateGovernorTermLimitProposalVotes(
      fixture.world,
      fixture.measureId,
      fixture.cause,
    );
    expect(constitutionalPosition(saved, fixture.measureId).phase).toBe(
      "rejected",
    );
    const loaded = deserializeWorld(serializeWorld(saved));
    expect(constitutionalActions(loaded, fixture.measureId)).toEqual(
      constitutionalActions(saved, fixture.measureId),
    );
    expect(
      recordStateGovernorTermLimitProposalVotes(
        loaded,
        fixture.measureId,
        fixture.cause,
      ),
    ).toBe(loaded);
  });
  it("keeps a controlled actual member absent without inventing their vote", () => {
    const fixture = proposal();
    const first = bodies(fixture.world, fixture.measureId)[0]!.seated.body
      .members[0]!;
    const at: World = {
      ...fixture.world,
      control: { kind: "person", personId: first.personId! },
    };
    const saved = recordStateGovernorTermLimitProposalVotes(
      at,
      fixture.measureId,
      fixture.cause,
    );
    const action = constitutionalActions(saved, fixture.measureId).find(
      (row) => row.detail.kind === "proposal-vote",
    )!;
    if (action.detail.kind !== "proposal-vote")
      throw Error("Rollcall missing.");
    expect(
      action.detail.vote.dispositions.find(
        (row) => row.personId === first.personId,
      )?.disposition,
    ).toBe("absent");
  });
  it("refuses missing body bindings, an unrecorded holder and mismatched terms", () => {
    const fixture = proposal();
    const missing: World = {
      ...fixture.world,
      history: { ...fixture.world.history, ruleChangeConsequenceBindings: [] },
    };
    expect(() =>
      recordStateGovernorTermLimitProposalVotes(
        missing,
        fixture.measureId,
        fixture.cause,
      ),
    ).toThrow(/dated institution binding/);
    expect(() =>
      recordStateGovernorTermLimitProposalVotes(
        fixture.world,
        fixture.measureId,
        { ...fixture.cause, holderPersonId: playerId },
      ),
    ).toThrow(/matching cause terms/);
    expect(() =>
      recordStateGovernorTermLimitProposalVotes(
        fixture.world,
        fixture.measureId,
        {
          ...fixture.cause,
          value: { ...fixture.cause.value, maxConsecutiveTerms: 5 },
        },
      ),
    ).toThrow(/matching cause terms/);
    expect(
      constitutionalActions(fixture.world, fixture.measureId),
    ).toHaveLength(1);
  });
});
