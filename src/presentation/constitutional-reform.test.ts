import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import {
  constitutionalActions,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
  recordStatewideRatification,
  stateAmendmentProfile,
} from "../simulation/constitutional-process";
import { makeIsoDate } from "../simulation/dates";
import { dispositionsFromCounts } from "../simulation/legislation-scenarios";
import {
  CONSTITUTIONAL_REFORM_BALLOT,
  CONSTITUTIONAL_REFORM_REVIEW,
  constitutionalReformReviewHandler,
  nextGeneralElectionDay,
  reformCause,
} from "../simulation/living-world/constitutional-reform";
import { chiefExecutiveJurisdictionId } from "../simulation/nationwide-world/government-jurisdiction";
import {
  checkExecutiveTermLimit,
  executiveTermLimitInWorld,
} from "../simulation/nationwide-world/executive-term-limits";
import { nextFilableStateExecutiveTerm } from "../simulation/nationwide-world/state-executive-turnover-calendar";
import { currentStateExecutiveHolders } from "../simulation/nationwide-world/state-executives";
import type { FutureDueItem, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * A legislature and its voters changing the governor's term limit with no
 * player involved, on an ordinary Nebraska start: one chamber, a generated
 * amendment profile, a seated governor and a dated calendar.
 */
function nebraska(): World {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "reform-A",
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: "nebraska",
    }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

const FIXTURE = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this scenario.",
  sourceEntityIds: [],
};

/** Ratify a one-term limit by hand, so the sitting governor is at the limit. */
function ratifyOneTermLimit(world: World): World {
  const stateId = chiefExecutiveJurisdictionId("NE")!;
  let w = proposeConstitutionalMeasure(world, {
    stableKey: "fixture:ne-one-term",
    jurisdictionId: stateId,
    jurisdictionKey: "US-NE",
    processKind: "state-amendment",
    designation: "Fixture Amendment",
    shortTitle: "One term",
    text: "No person shall be elected Governor for more than one term. Fictional test text.",
    textVersion: "v1",
    sponsoringAuthority: "Nebraska Legislature",
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "rule-field",
      officeKey: "us-ne-governor",
      field: "executive.term.limit",
      value: {
        maxConsecutiveTerms: 1,
        maxLifetimeTerms: null,
        lookbackYears: null,
      },
      applicability: { appliesTo: "immediately", countsPriorService: true },
    },
    ordinaryMeasureId: null,
  });
  const id = w.history.constitutionalMeasures!.at(-1)!.id;
  for (const body of stateAmendmentProfile("US-NE")!.bodies) {
    const members = Array.from({ length: body.members }, (_, i) => ({
      memberKey: `m:${i}`,
      name: `Member ${i}`,
      personId: null,
      caucusLabel: "",
    }));
    w = recordConstitutionalProposalVote(
      w,
      id,
      body.bodyKey,
      dispositionsFromCounts(members, { yea: body.members }),
      body.members,
      FIXTURE,
    );
  }
  return recordStatewideRatification(w, id, {
    kind: "statewide-vote",
    yes: 60,
    no: 40,
    electionAt: w.currentDate,
    statementFiledAt: w.currentDate,
  });
}

/** Measures on the governor's term limit; background amendments aside. */
function termLimitMeasures(world: World) {
  return (world.history.constitutionalMeasures ?? []).filter(
    (measure) =>
      measure.ruleDelta.kind === "rule-field" &&
      measure.ruleDelta.field === "executive.term.limit",
  );
}

function review(world: World, year: number): FutureDueItem {
  return {
    ...world.history.futureDueItems.find(
      (due) => due.transitionKey === CONSTITUTIONAL_REFORM_REVIEW,
    )!,
    stableKey: `constitutional-reform/v1:NE:${year}:review`,
  };
}

describe("a state amending its governor's term limit on its own", () => {
  it("puts a yearly review on the calendar once the clock moves", () => {
    const world = passOrdinaryDays(nebraska(), 1);
    const reviews = world.history.futureDueItems.filter(
      (due) => due.transitionKey === CONSTITUTIONAL_REFORM_REVIEW,
    );
    expect(reviews.some((due) => due.stableKey.includes(":NE:"))).toBe(true);
    // D.C. has a charter, not a constitution: no review.
    expect(reviews.some((due) => due.stableKey.includes(":DC:"))).toBe(false);
  });

  it("proposes nothing without a cause on the record", () => {
    const world = passOrdinaryDays(nebraska(), 1);
    expect(reformCause(world, "NE")).toBeNull();
    let proposals = 0;
    for (let year = 2030; year < 2230; year += 1) {
      const result = constitutionalReformReviewHandler(
        world,
        review(world, year),
      );
      if (termLimitMeasures(result.world).length) proposals += 1;
    }
    expect(proposals).toBe(0);
  });

  it(
    "amends the constitution through the state's own legislature and voters",
    { timeout: 300_000 },
    () => {
      const opened = passOrdinaryDays(nebraska(), 1);
      const governor = currentStateExecutiveHolders(opened).find(
        (holder) => holder.officeKey === "us-ne-governor",
      )!;
      expect(governor).toBeDefined();
      const limited = ratifyOneTermLimit(opened);
      const nextTerm = nextFilableStateExecutiveTerm(limited, "NE")!;
      // Nebraska's own limit before the amendment is its sourced two.
      expect(
        executiveTermLimitInWorld(opened, "NE", nextTerm.startsAt),
      ).toMatchObject({ basis: "sourced", limit: { maxConsecutiveTerms: 2 } });
      expect(
        executiveTermLimitInWorld(limited, "NE", nextTerm.startsAt),
      ).toMatchObject({ basis: "enacted", limit: { maxConsecutiveTerms: 1 } });
      // The governor's next election now reads the enacted limit.
      expect(
        checkExecutiveTermLimit(limited, {
          stateUsps: "NE",
          personId: governor.personId,
          termStartsAt: nextTerm.startsAt,
        })!.barredReason,
      ).not.toBeNull();
      expect(reformCause(limited, "NE")).toMatchObject({ direction: "extend" });

      // Rare: across two hundred qualifying years, only a few produce a proposal.
      const proposedYears: number[] = [];
      for (let year = 2030; year < 2230; year += 1) {
        const result = constitutionalReformReviewHandler(
          limited,
          review(limited, year),
        );
        if (
          termLimitMeasures(result.world).length >
          termLimitMeasures(limited).length
        )
          proposedYears.push(year);
      }
      expect(proposedYears.length).toBeGreaterThan(0);
      expect(proposedYears.length).toBeLessThan(20);

      // Take the first proposal that cleared the legislature; some do not.
      const outcomes = proposedYears.map((year) => {
        const world = constitutionalReformReviewHandler(
          limited,
          review(limited, year),
        ).world;
        const id = termLimitMeasures(world).at(-1)!.id;
        return { world, phase: constitutionalPosition(world, id).phase };
      });
      expect(
        outcomes.every((o) => ["ratification", "rejected"].includes(o.phase)),
      ).toBe(true);
      const proposed = outcomes.find((o) => o.phase === "ratification")!.world;
      const measure = termLimitMeasures(proposed).at(-1)!;
      expect(measure.ruleDelta).toMatchObject({
        kind: "rule-field",
        field: "executive.term.limit",
        value: { maxConsecutiveTerms: 2 },
      });
      // One chamber in Nebraska, voted under the profile's own membership.
      const votes = constitutionalActions(proposed, measure.id).flatMap(
        (action) =>
          action.detail.kind === "proposal-vote" ? [action.detail.vote] : [],
      );
      expect(votes).toHaveLength(1);
      expect(votes[0]!.eligibleMembers).toBe(
        stateAmendmentProfile("US-NE")!.bodies[0]!.members,
      );
      expect(() => assertWorldIntegrity(proposed)).not.toThrow();

      const ballot = proposed.history.futureDueItems.find(
        (due) =>
          due.transitionKey === CONSTITUTIONAL_REFORM_BALLOT &&
          due.stableKey.startsWith(`${measure.stableKey}:ballot:`),
      )!;
      expect(ballot.dueAt).toBe(nextGeneralElectionDay(ballot.dueAt));
      // Through the ordinary clock to election day and past it.
      const days =
        (Date.parse(ballot.dueAt) - Date.parse(proposed.currentDate)) /
          86_400_000 +
        1;
      const decided = passOrdinaryDays(proposed, days);
      const outcome = constitutionalPosition(
        decided,
        measure.id,
        ballot.dueAt,
      ).phase;
      expect(["operative", "rejected"]).toContain(outcome);
      if (outcome === "operative")
        expect(
          executiveTermLimitInWorld(decided, "NE", ballot.dueAt)!.limit,
        ).toMatchObject({ maxConsecutiveTerms: 2 });
      const saved = deserializeWorld(serializeWorld(decided));
      expect(saved.history.constitutionalMeasures).toEqual(
        decided.history.constitutionalMeasures,
      );
      expect(() => assertWorldIntegrity(saved)).not.toThrow();
    },
  );

  it("finds the first Tuesday after the first Monday in November", () => {
    expect(nextGeneralElectionDay(makeIsoDate("2026-01-01"))).toBe(
      "2026-11-03",
    );
    expect(nextGeneralElectionDay(makeIsoDate("2026-11-04"))).toBe(
      "2027-11-02",
    );
    expect(nextGeneralElectionDay(makeIsoDate("2030-06-01"))).toBe(
      "2030-11-05",
    );
  });
});
