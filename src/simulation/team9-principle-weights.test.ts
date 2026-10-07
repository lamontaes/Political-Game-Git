import { expect, it } from "vitest";
import { createProductionPolicyCatalog } from "./production-catalog";
const expected = [
  {
    key: "us-policy-positions:justice-public-safety.end-cash-bail",
    rows: [
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:public-safety",
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
    key: "us-policy-positions:justice-public-safety.mandatory-minimum-sentences",
    rows: [
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "consistent-with",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:justice-public-safety.civilian-oversight-of-police",
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
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "against",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.4,
      },
    ],
  },
  {
    key: "us-policy-positions:justice-public-safety.permit-to-carry-concealed",
    rows: [
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.75,
      },
    ],
  },
  {
    key: "us-policy-positions:justice-public-safety.raise-juvenile-court-age",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "against",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.4,
      },
    ],
  },
  {
    key: "us-policy-positions:justice-public-safety.restore-voting-after-sentence",
    rows: [
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.35,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.3,
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
