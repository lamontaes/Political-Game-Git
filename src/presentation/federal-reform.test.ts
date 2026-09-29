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
import { congressVoters } from "../simulation/governing/article-v";
import { ensureOfficeholderPrinciples } from "../simulation/governing/officeholder-principles";
import {
  FEDERAL_REFORM_REVIEW,
  FEDERAL_REFORM_STATE_ACTION,
  federalReformCause,
  federalReformReviewHandler,
  federalReformStateActionHandler,
  termLimitCount,
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
    "reads a ratified amendment as the presidency's term limit, and Congress and the state legislatures decide a proposal member by member",
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
        designation: `the Constitution as amended in ${limited.currentDate.slice(0, 4)}`,
      });
      expect(presidentialTermBar(limited, president, nextTerm)).toMatch(
        /one term the Constitution as amended in \d{4} allows/,
      );
      expect(federalReformCause(limited)).toMatchObject({
        direction: "extend",
        value: { maxLifetimeTerms: 2 },
      });

      // Congress counts itself, member by member: the President's party is
      // a reason to let them serve on, the other party a reason not to, and
      // amending the Constitution is a higher bar than a law. The same
      // Congress gives the same answer every year; no draw decides.
      const first = federalReformReviewHandler(limited, review(limited, 2027));
      const counted = ensureOfficeholderPrinciples(
        limited,
        (["house", "senate"] as const).flatMap((body) =>
          congressVoters(limited, body).map((voter) => voter.personId),
        ),
      );
      const cause = federalReformCause(limited)!;
      const count = termLimitCount(counted, 2027, cause);
      expect(count.houses.map((house) => house.rows.length)).toEqual([
        congressVoters(limited, "house").length,
        congressVoters(limited, "senate").length,
      ]);
      for (const house of count.houses)
        for (const row of house.rows) expect(row.reason).toMatch(/^member:/);
      expect(
        (first.world.history.constitutionalMeasures ?? []).length > 1,
      ).toBe(count.carries);
      for (const year of [2031, 2071, 2151])
        expect(
          federalReformReviewHandler(limited, review(limited, year)).world
            .history.constitutionalMeasures!.length,
        ).toBe(first.world.history.constitutionalMeasures!.length);

      // The states: a Congress that proposed it (a fixture), then each state
      // legislature ratifies when most of those who speak for it would.
      let world = proposeConstitutionalMeasure(limited, {
        stableKey: "federal-reform/v1:US:2027",
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        jurisdictionKey: "US",
        processKind: "federal-amendment",
        designation: "Proposed Amendment to the Constitution (2027)",
        shortTitle: "The President's term limit",
        text: "No person shall be elected to the office of the President more than twice. Fictional test text.",
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
          value: cause.value,
          applicability: { appliesTo: "immediately", countsPriorService: true },
        },
        ordinaryMeasureId: null,
      });
      const id = world.history.constitutionalMeasures!.at(-1)!.id;
      for (const [bodyKey, size] of [
        ["house", 435],
        ["senate", 100],
      ] as const)
        world = recordConstitutionalProposalVote(
          world,
          id,
          bodyKey,
          dispositionsFromCounts(
            Array.from({ length: size }, (_, i) => ({
              memberKey: `${bodyKey}:${i}`,
              name: `Member ${i}`,
              personId: null,
              caucusLabel: "",
            })),
            { yea: size },
          ),
          size,
          FIXTURE,
        );
      expect(constitutionalPosition(world, id).phase).toBe("ratification");
      let decided = world;
      for (const stateKey of ARTICLE_V_STATE_KEYS)
        decided = federalReformStateActionHandler(decided, {
          ...review(world, 2027),
          stableKey: `federal-reform/v1:US:2027:state:${stateKey}`,
          transitionKey: FEDERAL_REFORM_STATE_ACTION,
        }).world;
      const position = constitutionalPosition(decided, id);
      const approvals = constitutionalActions(decided, id).filter(
        (action) =>
          action.detail.kind === "state-ratification" && action.detail.approved,
      ).length;
      const stateActs = constitutionalActions(decided, id).filter(
        (action) => action.detail.kind === "state-ratification",
      );
      // Each state acts once, until the 38th ratification makes it law.
      expect(stateActs.length).toBeLessThanOrEqual(50);
      if (approvals < 38) expect(stateActs).toHaveLength(50);
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
      expect(() => assertWorldIntegrity(decided)).not.toThrow();
      const saved = deserializeWorld(serializeWorld(decided));
      expect(saved.history.constitutionalActions).toEqual(
        decided.history.constitutionalActions,
      );
      expect(() => assertWorldIntegrity(saved)).not.toThrow();
    },
  );
});
