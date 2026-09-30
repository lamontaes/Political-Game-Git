import { expect, it } from "vitest";
import { createProductionPolicyCatalog } from "./production-catalog";
const expected = [
  {
    key: "us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones",
    rows: [
      {
        key: "us-policy-positions:property-rights",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:tradition",
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
    key: "us-policy-positions:housing-land-use.rent-stabilization",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.85,
      },
    ],
  },
  {
    key: "us-policy-positions:housing-land-use.by-right-permitting",
    rows: [
      {
        key: "us-policy-positions:property-rights",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "against",
        weight: 0.65,
      },
    ],
  },
  {
    key: "us-policy-positions:housing-land-use.inclusionary-requirement",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.75,
      },
    ],
  },
  {
    key: "us-policy-positions:housing-land-use.preempt-local-housing-limits",
    rows: [
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "against",
        weight: 0.65,
      },
    ],
  },
  {
    key: "us-policy-positions:housing-land-use.right-to-counsel-in-eviction",
    rows: [
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.75,
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
    key: "us-policy-positions:business-commerce.cap-consumer-loan-rates",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.65,
      },
    ],
  },
  {
    key: "us-policy-positions:business-commerce.reduce-occupational-licensing",
    rows: [
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.85,
      },
    ],
  },
  {
    key: "us-policy-positions:business-commerce.legalize-cannabis-sales",
    rows: [
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.75,
      },
    ],
  },
  {
    key: "us-policy-positions:business-commerce.cap-development-incentives",
    rows: [
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:market-competition",
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
