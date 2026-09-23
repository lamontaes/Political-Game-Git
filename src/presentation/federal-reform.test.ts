import { describe, expect, it } from "vitest";
import { adultLifeIn } from "../../tests/fixtures/state-executive-entry";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalActions,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordArticleVRatification,
  recordConstitutionalProposalVote,
} from "../simulation/constitutional-process";
import { currentPresidentOf } from "../simulation/crisis/offices";
import { makeIsoDate } from "../simulation/dates";
import { dispositionsFromCounts } from "../simulation/legislation-scenarios";
import {
  FEDERAL_REFORM_REVIEW,
  FEDERAL_REFORM_STATE_ACTION,
  federalReformCause,
  federalReformReviewHandler,
  federalReformStateActionHandler,
} from "../simulation/living-world/federal-reform";
import { NATIONAL_ELECTION_JURISDICTION } from "../simulation/national-election-geography";
import {
  presidentialTermBar,
  presidentialTermLimitAt,
} from "../simulation/nationwide-world/presidential-turnover";
import type { FutureDueItem, World } from "../simulation/types";
import { passOrdinaryDays } from "./ordinary-life";

const FIXTURE = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this scenario.",
  sourceEntityIds: [],
};

/** Ratify, by hand, an amendment allowing one presidential term. */
function ratifyOneTermLimit(world: World): World {
  let w = proposeConstitutionalMeasure(world, {
    stableKey: "fixture:us-one-term",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    jurisdictionKey: "US",
    processKind: "federal-amendment",
    designation: "Fixture Amendment",
    shortTitle: "One term",
    text: "No person shall be elected President more than once. Fictional test text.",
    textVersion: "v1",
    sponsoringAuthority: "The Congress of the United States",
    sponsorPersonId: null,
    ratificationMode: "state-legislatures",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "rule-field",
      officeKey: "us-president",
      field: "executive.term.limit",
      value: {
        maxConsecutiveTerms: null,
        maxLifetimeTerms: 1,
        lookbackYears: null,
      },
      applicability: { appliesTo: "immediately", countsPriorService: true },
    },
    ordinaryMeasureId: null,
  });
  const id = w.history.constitutionalMeasures!.at(-1)!.id;
  for (const [bodyKey, size] of [
    ["house", 435],
    ["senate", 100],
  ] as const) {
    const members = Array.from({ length: size }, (_, i) => ({
      memberKey: `${bodyKey}:${i}`,
      name: `Member ${i}`,
      personId: null,
      caucusLabel: "",
    }));
    w = recordConstitutionalProposalVote(
      w,
      id,
      bodyKey,
      dispositionsFromCounts(members, { yea: size }),
      size,
      FIXTURE,
    );
  }
  for (const stateKey of ARTICLE_V_STATE_KEYS.slice(0, 38))
    w = recordArticleVRatification(w, id, {
      kind: "state-ratification",
      stateKey,
      body: "state-legislature",
      approved: true,
      authenticationKey: `fixture:${stateKey}`,
    });
  return w;
}

function review(world: World, year: number): FutureDueItem {
  return {
    ...world.history.futureDueItems.find(
      (due) => due.transitionKey === FEDERAL_REFORM_REVIEW,
    )!,
    stableKey: `federal-reform/v1:US:${year}:review`,
  };
}

describe("Congress and the states amending the U.S. Constitution on their own", () => {
  it("puts a yearly review on the calendar and proposes nothing without a cause", () => {
    const world = passOrdinaryDays(
      adultLifeIn("MT", "federal-reform").world,
      1,
    );
    expect(
      world.history.futureDueItems.some(
        (due) => due.transitionKey === FEDERAL_REFORM_REVIEW,
      ),
    ).toBe(true);
    // A first-term President under the Twenty-Second Amendment: no cause.
    expect(federalReformCause(world)).toBeNull();
    for (let year = 2027; year < 2227; year += 1)
      expect(
        federalReformReviewHandler(world, review(world, year)).world.history
          .constitutionalMeasures ?? [],
      ).toHaveLength(0);
  });

  it(
    "reads a ratified amendment as the presidency's term limit, and takes a proposal through Congress and the state legislatures",
    { timeout: 300_000 },
    () => {
      const opened = passOrdinaryDays(
        adultLifeIn("MT", "federal-reform").world,
        1,
      );
      const president = currentPresidentOf(opened)!.personId;
      const nextTerm = makeIsoDate("2029-01-20");
      expect(presidentialTermLimitAt(opened, nextTerm)).toMatchObject({
        limit: { maxLifetimeTerms: 2 },
        designation: "the Twenty-Second Amendment",
      });
      expect(presidentialTermBar(opened, president, nextTerm)).toBeNull();

      // Thirty-eight states make it law; the sitting President is now barred.
      const limited = ratifyOneTermLimit(opened);
      const fixture = limited.history.constitutionalMeasures!.at(-1)!;
      expect(constitutionalPosition(limited, fixture.id).phase).toBe(
        "operative",
      );
      expect(presidentialTermLimitAt(limited, nextTerm)).toMatchObject({
        limit: { maxLifetimeTerms: 1 },
        designation: "Fixture Amendment",
      });
      expect(presidentialTermBar(limited, president, nextTerm)).toMatch(
        /one term Fixture Amendment allows/,
      );
      expect(federalReformCause(limited)).toMatchObject({
        direction: "extend",
        value: { maxLifetimeTerms: 2 },
      });

      // Rare: across two hundred years with a cause, only a few proposals.
      const proposedYears: number[] = [];
      for (let year = 2027; year < 2227; year += 1) {
        const result = federalReformReviewHandler(
          limited,
          review(limited, year),
        );
        if (result.world.history.constitutionalMeasures!.length > 1)
          proposedYears.push(year);
      }
      expect(proposedYears.length).toBeGreaterThan(0);
      expect(proposedYears.length).toBeLessThan(20);

      const outcomes = proposedYears.map((year) => {
        const world = federalReformReviewHandler(
          limited,
          review(limited, year),
        ).world;
        const id = world.history.constitutionalMeasures!.at(-1)!.id;
        return { world, id, phase: constitutionalPosition(world, id).phase };
      });
      expect(
        outcomes.every((o) => ["ratification", "rejected"].includes(o.phase)),
      ).toBe(true);
      const proposed = outcomes.find((o) => o.phase === "ratification");
      expect(proposed).toBeDefined();
      const { world, id } = proposed!;
      const votes = constitutionalActions(world, id).flatMap((action) =>
        action.detail.kind === "proposal-vote" ? [action.detail.vote] : [],
      );
      expect(votes.map((vote) => vote.eligibleMembers)).toEqual([435, 100]);
      expect(votes.every((vote) => vote.outcome !== "failed")).toBe(true);
      expect(() => assertWorldIntegrity(world)).not.toThrow();

      // Every state legislature, and no one else, acts once.
      const actions = world.history.futureDueItems
        .filter((due) => due.transitionKey === FEDERAL_REFORM_STATE_ACTION)
        .filter((due) =>
          due.stableKey.startsWith(
            world.history.constitutionalMeasures!.at(-1)!.stableKey,
          ),
        )
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
      expect(actions).toHaveLength(50);
      expect(actions.some((due) => due.stableKey.endsWith("US-DC"))).toBe(
        false,
      );
      let decided = world;
      for (const due of actions)
        decided = federalReformStateActionHandler(decided, due).world;
      const position = constitutionalPosition(decided, id);
      const approvals = constitutionalActions(decided, id).filter(
        (action) =>
          action.detail.kind === "state-ratification" && action.detail.approved,
      ).length;
      if (approvals >= 38) {
        expect(position.phase).toBe("operative");
        expect(presidentialTermLimitAt(decided, nextTerm).limit).toMatchObject({
          maxLifetimeTerms: 2,
        });
        expect(presidentialTermBar(decided, president, nextTerm)).toBeNull();
      } else {
        expect(position.phase).toBe("ratification");
        expect(position.ratifiedStates).toHaveLength(approvals);
        expect(presidentialTermLimitAt(decided, nextTerm).limit).toMatchObject({
          maxLifetimeTerms: 1,
        });
      }
      const saved = deserializeWorld(serializeWorld(decided));
      expect(saved.history.constitutionalActions).toEqual(
        decided.history.constitutionalActions,
      );
      expect(() => assertWorldIntegrity(saved)).not.toThrow();
    },
  );
});
