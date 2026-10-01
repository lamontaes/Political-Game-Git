import { expect, it } from "vitest";
import { createProductionPolicyCatalog } from "./production-catalog";
const expected = [
  {
    key: "us-policy-positions:fiscal.adopt-income-tax",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:fiscal.graduated-income-tax",
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
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:fiscal.cap-property-tax-growth",
    rows: [
      {
        key: "us-policy-positions:property-rights",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.7,
      },
    ],
  },
  {
    key: "us-policy-positions:fiscal.exempt-groceries-from-sales-tax",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-policy-positions:fiscal.balanced-operating-budget",
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
        key: "us-policy-positions:equal-opportunity",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-policy-positions:fiscal.fund-pensions-to-schedule",
    rows: [
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.4,
      },
    ],
  },
  {
    key: "us-policy-positions:fiscal.minimum-reserve-balance",
    rows: [
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "consistent-with",
        weight: 0.4,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-policy-positions:labor-workforce.raise-minimum-wage",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:market-competition",
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
    key: "us-policy-positions:labor-workforce.city-minimum-wage",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:labor-workforce.local-minimum-wage-authority",
    rows: [
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-policy-positions:labor-workforce.paid-family-leave",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:labor-workforce.public-sector-collective-bargaining",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:labor-workforce.right-to-work",
    rows: [
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "against",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
];
it("retains all submitted arguments through the production catalog", () => {
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
