import { expect, it } from "vitest";
import { createProductionPolicyCatalog } from "./production-catalog";
const expected = [
  {
    key: "us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit",
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
        weight: 0.65,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.45,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "against",
        weight: 0.35,
      },
    ],
  },
  {
    key: "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.35,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.4,
      },
    ],
  },
  {
    key: "us-policy-positions:transportation-infrastructure.fare-free-transit",
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
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax",
    rows: [
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "against",
        weight: 0.4,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.35,
      },
    ],
  },
  {
    key: "us-policy-positions:transportation-infrastructure.public-broadband",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
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
        weight: 0.85,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:transportation-infrastructure.fix-it-first",
    rows: [
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.4,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.3,
      },
    ],
  },
  {
    key: "us-policy-positions:environment-energy.clean-electricity-standard",
    rows: [
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.6,
      },
    ],
  },
  {
    key: "us-policy-positions:environment-energy.price-carbon",
    rows: [
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-treatment",
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
    key: "us-policy-positions:environment-energy.ban-new-gas-hookups",
    rows: [
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.7,
      },
    ],
  },
  {
    key: "us-policy-positions:environment-energy.restrict-building-in-flood-zones",
    rows: [
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-policy-positions:environment-energy.bottle-deposit",
    rows: [
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.35,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal",
    rows: [
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
    rows: [
      {
        key: "us-policy-positions:tradition",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-policy-positions:agriculture-natural-resources.expand-public-land-access",
    rows: [
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:environmental-stewardship",
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
