import { expect, it } from "vitest";
import { loadPolicyPacks } from "./policy-packs";
import { POLICY_PACKS } from "./policy-pack-registry";
import {
  TAX_TERMS_POLICY_PACK,
  TAX_TERM_QUESTION_ROWS,
} from "./policy-pack-tax-terms";
import { TAX_LAW_TERM_KEYS, TAX_NUMERIC_LAW_TERMS } from "./tax-law-term-keys";

it("loads tax questions without assigning any rates or replacing existing questions", () => {
  const original = loadPolicyPacks(
    POLICY_PACKS.filter((pack) => pack.pack !== TAX_TERMS_POLICY_PACK.pack),
  );
  const next = loadPolicyPacks(POLICY_PACKS);
  expect(next.report.rejections).toEqual([]);
  for (const row of original.propositions) {
    expect(next.propositions.find((entry) => entry.id === row.id)).toEqual(row);
  }
  expect(TAX_TERM_QUESTION_ROWS.length).toBeGreaterThan(0);
  for (const row of TAX_TERM_QUESTION_ROWS) {
    expect(
      next.propositions.some(
        (p) => p.stableKey === `${TAX_TERMS_POLICY_PACK.pack}:${row.key}`,
      ),
    ).toBe(true);
  }
  for (const row of TAX_TERM_QUESTION_ROWS) {
    expect(row.parameters?.map((term) => term.key)).toEqual(
      Object.values(TAX_LAW_TERM_KEYS),
    );
    expect(row.consequences).toBeUndefined();
    expect(row.principles).toBeUndefined();
  }
});

it("keeps exact rational rates separate from occurrence allowances and timing", () => {
  expect(TAX_NUMERIC_LAW_TERMS.map(({ field, unit }) => [field, unit])).toEqual(
    [
      ["rateNumerator", "count"],
      ["rateDenominator", "count"],
      ["allowanceMinorUnits", "minor"],
      ["effectiveDelayDays", "days"],
      ["collectionLagDays", "days"],
    ],
  );
  expect(
    TAX_TERM_QUESTION_ROWS.some(
      (row) => row.key === "federal.property-tax-terms",
    ),
  ).toBe(false);
});

it("keeps state tax questions at their own level across all 56 jurisdictions", async () => {
  const { createProductionPolicyCatalog } =
    await import("./production-catalog");
  const { stateJurisdictionForKey } = await import("./life-places");
  const { STATES } = await import("./state-reference");
  const { questionAuthority } = await import("./governing/question-authority");
  const { NATIONAL_ELECTION_JURISDICTION } =
    await import("./national-election-geography");
  const policyCatalog = createProductionPolicyCatalog();
  const world = { policyCatalog };
  const stateQuestion = Object.values(policyCatalog.propositions).find(
    (p) => p.stableKey === "us-tax-terms:state.income-tax-terms",
  )!;
  const federalQuestion = Object.values(policyCatalog.propositions).find(
    (p) => p.stableKey === "us-tax-terms:federal.income-tax-terms",
  )!;
  expect(stateQuestion).toBeDefined();
  expect(federalQuestion).toBeDefined();
  let checked = 0;
  for (const usps of Object.keys(STATES)) {
    const place = stateJurisdictionForKey(`US-${usps}`)!;
    expect(place).toBeDefined();
    const withPlaces = { ...world, jurisdictions: { [place.id]: place } };
    expect(
      questionAuthority(withPlaces, place.id, federalQuestion.id).may,
    ).toBe("no");
    expect(questionAuthority(withPlaces, place.id, stateQuestion.id).dial).toBe(
      "income-tax",
    );
    checked += 1;
  }
  expect(checked).toBe(56);
  expect(
    questionAuthority(
      {
        ...world,
        jurisdictions: {
          [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
        },
      },
      NATIONAL_ELECTION_JURISDICTION.id,
      stateQuestion.id,
    ).may,
  ).toBe("no");
});
