import { expect, it } from "vitest";
import { createProductionPolicyCatalog } from "./production-catalog";
const expected = [
  {
    key: "us-policy-positions:government-operations.independent-redistricting",
    rows: [
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.55,
      },
      { key: "us-policy-positions:tradition", bearing: "against", weight: 0.6 },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.3,
      },
    ],
  },
  {
    key: "us-policy-positions:government-operations.require-photo-id-to-vote",
    rows: [
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-policy-positions:government-operations.automatic-voter-registration",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.7,
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
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-policy-positions:government-operations.legislative-term-limits",
    rows: [
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.9,
      },
      { key: "us-policy-positions:tradition", bearing: "against", weight: 0.7 },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:government-operations.council-term-limits",
    rows: [
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.9,
      },
      { key: "us-policy-positions:tradition", bearing: "against", weight: 0.7 },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:government-operations.ban-lobbying-after-office",
    rows: [
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "against",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.35,
      },
    ],
  },
  {
    key: "us-policy-positions:government-operations.broaden-local-authority",
    rows: [
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-policy-positions:government-operations.independent-ward-commission",
    rows: [
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.65,
      },
      { key: "us-policy-positions:tradition", bearing: "against", weight: 0.6 },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.35,
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
