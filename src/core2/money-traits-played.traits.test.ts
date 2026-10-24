/**
 * The money family in play: a place drawn from all 56, built as the game
 * builds it (`buildBenchWorld`, two-level, every module), plays its first
 * two months. Two residents who faced about the same case for a money
 * decision, one leaning toward it and one away, decided differently; the
 * test names both, and the borrowing application the borrower's yes wrote.
 */
import { describe, expect, it } from "vitest";
import { testPlace } from "./money-traits-kit";
import { coreAPI } from "./state";
import { decisionTraitWeight } from "./trait-decisions";
import { describePair, playedPairs } from "./trait-pairs";

/** The money decisions a played window weighs for named actors, with the chooser's yes option. */
const MONEY = {
  "credit.borrow": null,
  "jobs.counted-apply": null,
  "jobs.counted-accept": null,
  "jobs.start-looking": "jobs-look",
  "jobs.apply": "jobs-apply",
  "jobs.accept-offer": "jobs-accept",
  "business.found": "business-found",
  "business.owner-draw": "business-owner-draw",
  "housing.buy-home": "housing-buy",
} as const;

describe("money decisions in a played window", () => {
  it("two residents in the same case who lean opposite ways decide differently, by record", () => {
    const { world, calls, pairs, label, tried } = playedPairs(
      (attempt) => {
        const place = testPlace(`money-played:${attempt}`);
        return { seed: place.seed, place };
      },
      62,
      MONEY,
    );
    const applications = coreAPI(world.core).moduleState("credit").snapshot()
      .tables.applications as unknown as {
      id: string;
      borrowerId: string;
      date: string;
    }[];
    const applied = (actorId: string, date: string) =>
      applications.find((r) => r.borrowerId === actorId && r.date === date)?.id;
    console.log(
      `money pairs at ${label}, ${calls.length} weighed calls:\n${pairs
        .map((pair) =>
          describePair(
            pair,
            pair.decisionId === "credit.borrow"
              ? applied(pair.yes.actorId, pair.yes.date)
              : undefined,
          ),
        )
        .join("\n")}`,
    );
    expect(pairs.length, `places tried: ${tried.join("; ")}`).toBeGreaterThan(
      0,
    );
    // Founding's cases sit within reach of a trait lean: at least 1 weighing in 200 is no more than two leans (twice the weight) below not starting. At the old baseline the best of a year's 46,674 weighings sat 1.1 below it and personality turned none.
    const founding = calls.filter(
      (call) => call.decisionId === "business.found",
    );
    if (founding.length >= 1000) {
      const reach = 2 * decisionTraitWeight(world.core, "business.found");
      const near = founding.filter((call) => call.bare > -reach).length;
      expect(
        near / founding.length,
        `${near} of ${founding.length} founding weighings within ${reach} of not starting at ${label}`,
      ).toBeGreaterThanOrEqual(0.005);
    }
    const borrow = pairs.find((p) => p.decisionId === "credit.borrow");
    if (borrow)
      expect(
        applied(borrow.yes.actorId, borrow.yes.date),
        `the borrower's application at ${label}`,
      ).toBeDefined();
  }, 900_000);
});
