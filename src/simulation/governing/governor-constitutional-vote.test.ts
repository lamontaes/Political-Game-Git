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
import {
  decideChamberVote,
  stateConstitutionalBody,
  stateConstitutionalRoster,
} from "./chamber-votes";
import {
  termLimitBallot,
  termLimitConsiderations,
} from "../living-world/federal-reform";
import {
  CONSTITUTIONAL_REFORM_REVIEW,
  constitutionalReformReviewHandler,
  recordStateGovernorTermLimitProposalVotes,
  reformCause,
} from "../living-world/constitutional-reform";
import { addDays, makeIsoDate } from "../dates";
import { resolveRequiredVotes } from "../legislature-rules";
import { scheduleFutureDueItem } from "../future-transitions";
import { datedTermsInOffice } from "../nationwide-world/prior-terms";
import { stateExecutiveTermRuleInWorld } from "../nationwide-world/executive-term-rules-in-world";
import {
  advanceWorld,
  recordWorldEvent,
  writeWithWorldIntegrityOnce,
} from "../world";

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
  it("files the recorded tenure cause before voting and retains a rejected actual rollcall", () => {
    const usps = state.jurisdictionKey.slice(3);
    const office = stateExecutiveOffice(usps)!;
    const holder = currentStateExecutiveHolders(world).find(
      (row) =>
        row.personId === governorId && row.officeKey === office.officeKey,
    )!;
    expect(holder.startedAt).not.toBeNull();
    const rule = stateExecutiveTermRuleInWorld(world, usps, world.currentDate)!;
    const startedAt = holder.startedAt!;
    const historicalDate = (termsBefore: number) =>
      makeIsoDate(
        `${Number(startedAt.slice(0, 4)) - termsBefore * rule.termYears}${startedAt.slice(4)}`,
      );
    let at = writeWithWorldIntegrityOnce(world, () => {
      let next = world;
      for (const termsBefore of [2, 1]) {
        const startsAt = historicalDate(termsBefore);
        const endsAt = historicalDate(termsBefore - 1);
        next = recordWorldEvent(next, {
          stableKey: `a79:filing-prior-term:${startsAt}`,
          type: "world.office-tenure",
          occurredAt: startsAt,
          recordedAt: next.currentDate,
          jurisdictionId: jurisdiction.id,
          involvedEntityIds: [governorId],
          participants: [
            {
              personId: governorId,
              role: "focus:subject",
              detail: office.displayName,
            },
          ],
          personFactConstraints: [],
          visibility: "public",
          tags: [
            `office:${office.officeKey}`,
            `term-end:${endsAt}`,
            "provenance:authored-fixture",
          ],
          summary:
            "Supplied prior governor tenure for the recorded-cause filing fixture.",
          context: {
            location: null,
            socialContext: null,
            pressure: null,
            choice: null,
            motivation: null,
            immediateReaction: null,
          },
        });
      }
      return next;
    });
    expect(datedTermsInOffice(at, governorId, office.officeKey)).toHaveLength(
      3,
    );
    const cause = reformCause(at, usps)!;
    expect(cause).toMatchObject({
      direction: "restore",
      holderPersonId: governorId,
    });
    if (cause.direction !== "restore")
      throw Error("The recorded cause must restore the limit.");
    const ballotCause = {
      direction: cause.direction,
      holderPersonId: cause.holderPersonId,
    };
    const actualMembers = stateAmendmentProfile(
      state.jurisdictionKey,
    )!.bodies.flatMap((body) => {
      const pack = stateConstitutionalRoster(
        at,
        jurisdiction.id,
        body.bodyKey,
      )!;
      return pack.seated.body.members;
    });
    const oldBallots = actualMembers.flatMap((member) =>
      member.personId
        ? [
            termLimitBallot(
              at,
              `old:preflight:${member.memberKey}`,
              { memberKey: member.memberKey, personId: member.personId },
              ballotCause,
              governorReasons,
            ),
          ]
        : [],
    );
    const cast = oldBallots.filter((row) => row.ballot !== "absent");
    const oldYes = cast.filter((row) => row.ballot === "yea").length;
    const profile = stateAmendmentProfile(state.jurisdictionKey)!;
    const oldWouldFile =
      cast.length > 0 &&
      profile.bodies.every(
        (body) =>
          Math.round((body.members * oldYes) / cast.length) >=
          resolveRequiredVotes(profile.base, body.members).requiredVotes,
      );
    expect(oldWouldFile).toBe(false);
    const year = Number(at.currentDate.slice(0, 4));
    const proposalKey = `constitutional-reform/v1:${usps}:${year}`;
    at = scheduleFutureDueItem(at, {
      stableKey: `${proposalKey}:review`,
      dueAt: addDays(at.currentDate, 1),
      transitionKey: CONSTITUTIONAL_REFORM_REVIEW,
      entityIds: [jurisdiction.id],
      jurisdictionId: jurisdiction.id,
      provenance: {
        kind: "authored",
        note: "One-day recorded tenure-cause filing fixture, not natural multiyear service.",
      },
    });
    const due = at.history.futureDueItems.find(
      (row) => row.stableKey === `${proposalKey}:review`,
    )!;
    const saved = advanceWorld(at, 1, {
      get: (key) =>
        key === CONSTITUTIONAL_REFORM_REVIEW
          ? constitutionalReformReviewHandler
          : undefined,
    });
    const measure = saved.history.constitutionalMeasures!.find(
      (row) => row.stableKey === proposalKey,
    )!;
    expect(measure).toBeDefined();
    expect(measure.ruleDelta).toMatchObject({
      kind: "rule-field",
      officeKey: office.officeKey,
      field: "executive.term.limit",
      value: cause.value,
      applicability: {
        appliesTo: "terms-beginning-after",
        countsPriorService: false,
      },
    });
    expect(measure.proposalRule).toEqual(
      stateAmendmentProfile(state.jurisdictionKey)!.base,
    );
    expect(constitutionalPosition(saved, measure.id).phase).toBe("rejected");
    const votes = constitutionalActions(saved, measure.id).filter(
      (row) => row.detail.kind === "proposal-vote",
    );
    expect(votes.length).toBeGreaterThan(0);
    for (const action of votes) {
      if (action.detail.kind !== "proposal-vote")
        throw Error("Actual rollcall missing.");
      expect(action.sequence).toBeGreaterThan(measure.sequence);
      const actual = stateConstitutionalBody(
        saved,
        measure.id,
        action.detail.bodyKey,
      ).seated.body.members;
      expect(
        action.detail.vote.dispositions.map((row) => [
          row.memberKey,
          row.personId,
        ]),
      ).toEqual(actual.map((row) => [row.memberKey, row.personId]));
      for (const row of action.detail.vote.dispositions) {
        if (!row.personId) continue;
        const old = termLimitBallot(
          saved,
          `old:filing:${row.memberKey}`,
          { memberKey: row.memberKey, personId: row.personId },
          ballotCause,
          governorReasons,
        );
        expect(row.disposition).toBe(old.ballot);
        expect(row.reason).toBe(old.reason);
      }
    }
    expect(
      saved.history.futureDueItems.some((row) =>
        row.stableKey.startsWith(`${proposalKey}:ballot:`),
      ),
    ).toBe(false);
    const loaded = deserializeWorld(serializeWorld(saved));
    expect(constitutionalActions(loaded, measure.id)).toEqual(
      constitutionalActions(saved, measure.id),
    );
    const repeated = constitutionalReformReviewHandler(loaded, due).world;
    expect(
      repeated.history.constitutionalMeasures!.filter(
        (row) => row.stableKey === proposalKey,
      ),
    ).toHaveLength(1);
    expect(constitutionalActions(repeated, measure.id)).toEqual(
      constitutionalActions(saved, measure.id),
    );
    const first = votes[0]!;
    if (first.detail.kind !== "proposal-vote") throw Error("Rollcall missing.");
    const example = first.detail.vote.dispositions[0]!;
    const exampleMember = stateConstitutionalBody(
      saved,
      measure.id,
      first.detail.bodyKey,
    ).seated.body.members.find(
      (member) => member.memberKey === example.memberKey,
    )!;
    console.info(
      "A79 cause-backed governor filing",
      JSON.stringify({
        seed,
        place: place.displayName,
        state: state.jurisdictionKey,
        cause: cause.reason,
        proposalId: measure.id,
        phase: constitutionalPosition(saved, measure.id).phase,
        oldWouldFile,
        actualVotes: votes.reduce(
          (sum, row) =>
            sum +
            (row.detail.kind === "proposal-vote"
              ? row.detail.vote.dispositions.length
              : 0),
          0,
        ),
        example: {
          name: exampleMember.name,
          personId: example.personId,
          ballot: example.disposition,
          reason: example.reason,
        },
        fixture:
          "Supplied canonical prior tenure records; actual one-day review caller, not natural multiyear office service",
      }),
    );
  });
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
