import { expect, it } from "vitest";
import { createProductionPolicyCatalog } from "./production-catalog";
const expected = [
  {
    key: "us-federal-positions:budget.pay-for-a-higher-debt-limit",
    rows: [
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-federal-positions:tax.raise-top-income-tax-rate",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-federal-positions:monetary-financial.cap-consumer-loan-interest",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-federal-positions:defense.grow-defense-spending",
    rows: [
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-federal-positions:foreign-affairs.increase-foreign-aid",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.65,
      },
    ],
  },
  {
    key: "us-federal-positions:trade.raise-tariffs",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-federal-positions:immigration.admit-more-immigrants",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.55,
      },
      { key: "us-policy-positions:tradition", bearing: "against", weight: 0.7 },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "against",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-federal-positions:health.medicare-drug-price-negotiation",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.7,
      },
    ],
  },
  {
    key: "us-federal-positions:social-insurance.raise-retirement-age",
    rows: [
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.8,
      },
    ],
  },
  {
    key: "us-federal-positions:education.forgive-student-loans",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-federal-positions:housing.vouchers-for-every-eligible-family",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-federal-positions:transport-water.expand-passenger-rail",
    rows: [
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.65,
      },
    ],
  },
  {
    key: "us-federal-positions:energy-environment.limit-power-plant-carbon",
    rows: [
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.7,
      },
    ],
  },
  {
    key: "us-federal-positions:agriculture.cut-farm-subsidies",
    rows: [
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-federal-positions:emergencies.states-share-disaster-costs",
    rows: [
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-federal-positions:justice-rights.reduce-mandatory-minimums",
    rows: [
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-federal-positions:government.ban-congressional-stock-trading",
    rows: [
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.65,
      },
    ],
  },
  {
    key: "us-federal-positions:science-communications.national-data-privacy",
    rows: [
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-federal-positions:territories-culture.statehood-for-dc",
    rows: [
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.65,
      },
      { key: "us-policy-positions:tradition", bearing: "against", weight: 0.8 },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
];
it("loads every submitted federal argument with its canonical principle and weight", () => {
  const c = createProductionPolicyCatalog();
  for (const l of expected) {
    const p = Object.values(c.propositions).find((p) => p.stableKey === l.key)!;
    expect(p).toBeDefined();
    expect(p.principles).toHaveLength(l.rows.length);
    for (const r of l.rows) {
      const id = Object.values(c.principles).find(
        (p) => p.stableKey === r.key,
      )!.id;
      expect(
        p.principles!.find(
          (p) => p.principleId === id && p.bearing === r.bearing,
        ),
      ).toMatchObject({ weight: r.weight });
    }
  }
});
