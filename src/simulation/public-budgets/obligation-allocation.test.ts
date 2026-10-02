import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { buildProductionWorld } from "../../presentation/production-world";
import { budgetLawReading, budgetObligationPayment } from "./fiscal";
import { withOpenedBudgets } from ".";
import { BUDGET_PROGRAMS, PUBLIC_BUDGETS_VERSION } from "./store";

describe("shared obligation allocation", () => {
  it("preserves measured voluntary shares and above-minimum allocations", () => {
    const reading = {
      answer: "unknown",
      measureId: null,
      level: null,
    } as const;
    expect(budgetObligationPayment(1000, 0.75, reading)).toBe(750);
    expect(
      budgetObligationPayment(1000, 0.75, { ...reading, answer: "no" }),
    ).toBe(750);
    expect(
      budgetObligationPayment(1000, 1.25, { ...reading, answer: "yes" }),
    ).toBe(1250);
    expect(
      budgetObligationPayment(1000, 0.75, {
        ...reading,
        answer: "yes",
        requiredContributionShare: 1.1,
      }),
    ).toBe(1100);
    expect(
      budgetObligationPayment(1000, 0.75, {
        ...reading,
        answer: "yes",
        requiredContributionShare: 0.5,
      }),
    ).toBe(1000);
  });

  it("records the evaluated pension appropriation in a random new game's actual books", () => {
    const seed = "overflow4-a17-shared-obligation-20261002";
    const place = drawRandomPlace(seed);
    const { world, playerPersonId } = buildProductionWorld({
      seed,
      place,
      age: 34,
      givenName: null,
      familyName: null,
      startingLife: "ordinary-life",
      household: "lives-alone",
      depth: "summarize-earlier-life",
    });
    expect(world.people[playerPersonId]).toBeDefined();
    const books = withOpenedBudgets(
      world,
      {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      },
      world.currentDate,
    );
    expect(books.governments.length).toBeGreaterThan(0);
    const government = books.governments.find((row) => row.level === "state")!;
    expect(government, `${place.displayName} / ${seed}`).toBeDefined();
    const year = government.years[0]!;
    const law = budgetLawReading(
      world,
      government.lawJurisdictionId,
      "pensions",
      world.currentDate,
      false,
    );
    expect(
      year.appropriations[BUDGET_PROGRAMS.indexOf("pensionContribution")],
    ).toBe(
      budgetObligationPayment(
        year.pensionRequired,
        government.pension.paidShare,
        law,
      ),
    );
    expect(books.cursor).toEqual({ flows: 0, outcomes: 0 });
  });
});
