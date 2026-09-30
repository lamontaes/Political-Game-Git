import { expect, it } from "vitest";
import { loadPolicyPacks } from "./policy-packs";
import { US_POLICY_POSITIONS_PACK } from "./policy-pack-us-policy-positions";
import { US_STATE_AND_LOCAL_POLICY_PACK } from "./policy-pack-us-state-and-local";
const expected = [
  {
    key: "us-policy-positions:education.equalize-school-funding",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-policy-positions:education.public-funds-for-private-schooling",
    rows: [
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "consistent-with",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.65,
      },
    ],
  },
  {
    key: "us-policy-positions:education.raise-teacher-minimum-salary",
    rows: [
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-policy-positions:education.universal-preschool",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.5,
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
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-policy-positions:education.freeze-public-tuition",
    rows: [
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:market-competition",
        bearing: "against",
        weight: 0.5,
      },
    ],
  },
  {
    key: "us-policy-positions:education.state-curriculum-standards",
    rows: [
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.6,
      },
      { key: "us-policy-positions:tradition", bearing: "against", weight: 0.5 },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.45,
      },
    ],
  },
  {
    key: "us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work",
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
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:personal-liberty",
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
    key: "us-policy-positions:civil-family-community.city-nondiscrimination-ordinance",
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
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:worker-protection",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:limited-government",
        bearing: "against",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.4,
      },
    ],
  },
  {
    key: "us-policy-positions:civil-family-community.restrict-abortion",
    rows: [
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
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
        weight: 0.4,
      },
    ],
  },
  {
    key: "us-policy-positions:civil-family-community.fund-public-libraries",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.6,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.85,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.55,
      },
    ],
  },
  {
    key: "us-policy-positions:civil-family-community.local-control-of-library-materials",
    rows: [
      {
        key: "us-policy-positions:local-control",
        bearing: "consistent-with",
        weight: 0.95,
      },
      {
        key: "us-policy-positions:transparency",
        bearing: "consistent-with",
        weight: 0.7,
      },
      {
        key: "us-policy-positions:tradition",
        bearing: "consistent-with",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:personal-liberty",
        bearing: "against",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-treatment",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "against",
        weight: 0.65,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.35,
      },
    ],
  },
  {
    key: "us-policy-positions:civil-family-community.dedicated-parks-funding",
    rows: [
      {
        key: "us-policy-positions:collective-provision",
        bearing: "consistent-with",
        weight: 0.9,
      },
      {
        key: "us-policy-positions:equal-opportunity",
        bearing: "consistent-with",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:environmental-stewardship",
        bearing: "consistent-with",
        weight: 0.75,
      },
      {
        key: "us-policy-positions:public-safety",
        bearing: "consistent-with",
        weight: 0.5,
      },
      {
        key: "us-policy-positions:fiscal-restraint",
        bearing: "against",
        weight: 0.8,
      },
      {
        key: "us-policy-positions:local-control",
        bearing: "against",
        weight: 0.55,
      },
      {
        key: "us-policy-positions:property-rights",
        bearing: "against",
        weight: 0.4,
      },
    ],
  },
];
it("retains all twelve education and civil law arguments in the canonical catalog", () => {
  const c = loadPolicyPacks([
    US_STATE_AND_LOCAL_POLICY_PACK,
    US_POLICY_POSITIONS_PACK,
  ]);
  expect(c.report.rejections).toEqual([]);
  for (const l of expected) {
    const p = c.propositions.find((p) => p.stableKey === l.key)!;
    expect(p).toBeDefined();
    expect(p.principles).toHaveLength(l.rows.length);
    for (const r of l.rows) {
      const id = c.principles.find((p) => p.stableKey === r.key)!.id;
      expect(p.principles!.find((p) => p.principleId === id && p.bearing === r.bearing)).toMatchObject({
        bearing: r.bearing,
        weight: r.weight,
      });
    }
  }
});
