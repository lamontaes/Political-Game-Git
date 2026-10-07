import type { PolicyPack } from "./policy-packs";
import { FEDERAL_MANDATORY_MINIMUM_ROW } from "./law-consequences/modules/federal-justice-rights";

/**
 * Positions on federal questions: one for each field of federal government,
 * for members of Congress to file bills on and vote by.
 *
 * Authored fiction, like the state and local positions in
 * `policy-pack-us-policy-positions.ts`, and for the same reason: nothing
 * establishes that any position is the one to take. Each is a question a
 * person can agree or disagree with, and each names the principles it engages
 * from that pack, so a member's recorded convictions reach it.
 *
 * Its own pack, loaded after the federal vocabulary it points into, so every
 * id the catalog already had keeps its place. Coverage is one position per
 * field and deliberately partial: most federal issues still have none.
 */

const NOTE =
  "Federal positions a member of Congress can hold and a bill can be about, " +
  "authored for play against the sourced federal issue vocabulary. No source " +
  "establishes that any of these is the right position or that Congress has " +
  "adopted it.";

export const US_FEDERAL_POSITIONS_PACK: PolicyPack = {
  pack: "us-federal-positions",
  provenance: { kind: "authored-fiction", note: NOTE },
  propositions: [
    {
      key: "budget.pay-for-a-higher-debt-limit",
      parameters: [
        { key: "limit", value: "usd-federal-debt-limit" },
        { key: "offset", value: "required-spending-reduction-usd" },
      ],
      issue: "us-federal:budget.borrowing",
      name: "Pay for a higher debt limit",
      question:
        "Should Congress have to cut spending before it raises the federal debt limit?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:public-safety",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "tax.raise-top-income-tax-rate",
      parameters: [
        { key: "rate", value: "share-of-top-bracket-taxable-income" },
        { key: "threshold", value: "annual-taxable-income-usd" },
      ],
      issue: "us-federal:tax.income-tax",
      name: "Raise the top federal income tax rate",
      question: "Should the top federal income tax rate go up?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:equal-treatment",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:property-rights",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "monetary-financial.cap-consumer-loan-interest",
      parameters: [
        { key: "cap", value: "annual-percentage-rate" },
        { key: "coverage", value: "covered-loan-categories" },
      ],
      issue: "us-federal:monetary-financial.consumer-finance",
      name: "Cap consumer loan interest",
      question: "Should federal law cap the interest rate on consumer loans?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:worker-protection",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:personal-liberty",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:equal-treatment",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:property-rights",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "defense.grow-defense-spending",
      parameters: [
        { key: "appropriation", value: "usd-per-federal-fiscal-year" },
      ],
      issue: "us-federal:defense.procurement",
      name: "Grow defense spending",
      question: "Should defense spending grow faster than inflation?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:public-safety",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "us-policy-positions:worker-protection",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "foreign-affairs.increase-foreign-aid",
      parameters: [
        { key: "appropriation", value: "usd-per-federal-fiscal-year" },
        { key: "coverage", value: "eligible-aid-programs" },
      ],
      issue: "us-federal:foreign-affairs.foreign-assistance",
      name: "Increase foreign aid",
      question:
        "Should the United States spend more on aid to other countries?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "us-policy-positions:public-safety",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.65,
        },
      ],
    },
    {
      key: "trade.raise-tariffs",
      parameters: [
        { key: "rate", value: "share-of-import-customs-value" },
        { key: "coverage", value: "covered-import-categories-and-origins" },
      ],
      issue: "us-federal:trade.tariffs-customs",
      name: "Raise tariffs on imports",
      question: "Should the United States raise tariffs on imported goods?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:worker-protection",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:public-safety",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:property-rights",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "immigration.admit-more-immigrants",
      parameters: [
        { key: "cap", value: "admissions-per-fiscal-year" },
        { key: "coverage", value: "covered-admission-categories" },
      ],
      issue: "us-federal:immigration.admission-status",
      name: "Admit more immigrants",
      question: "Should the United States admit more immigrants each year?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:personal-liberty",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "us-policy-positions:tradition",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "us-policy-positions:worker-protection",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "us-policy-positions:public-safety",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "health.medicare-drug-price-negotiation",
      parameters: [
        { key: "authorized", value: "yes-or-no" },
        { key: "coverage", value: "eligible-drugs-and-programs" },
      ],
      issue: "us-federal:health.medicare",
      name: "Medicare drug price negotiation",
      question:
        "Should Medicare negotiate the prices it pays for prescription drugs?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:worker-protection",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:property-rights",
          bearing: "against",
          weight: 0.7,
        },
      ],
    },
    {
      key: "social-insurance.raise-retirement-age",
      parameters: [
        { key: "age", value: "years-of-age" },
        { key: "coverage", value: "covered-birth-cohorts" },
      ],
      issue: "us-federal:social-insurance.retirement-survivors",
      name: "Raise the Social Security retirement age",
      question:
        "Should the age for full Social Security retirement benefits go up?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "consistent-with",
          weight: 0.45,
        },
        {
          principle: "us-policy-positions:worker-protection",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "against",
          weight: 0.8,
        },
      ],
    },
    {
      key: "education.forgive-student-loans",
      parameters: [
        { key: "cap", value: "usd-forgiven-per-borrower" },
        { key: "eligibility", value: "eligible-loans-and-borrowers" },
      ],
      issue: "us-federal:education.student-aid",
      name: "Forgive federal student loans",
      question: "Should the federal government forgive student loan debt?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:equal-treatment",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:property-rights",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "labor-commerce.raise-federal-minimum-wage",
      parameters: [
        { key: "floor", value: "usd-per-work-hour" },
        { key: "coverage", value: "covered-worker-categories" },
      ],
      issue: "us-federal:labor-commerce.labor-standards",
      name: "Raise the federal minimum wage",
      question: "Should the federal minimum wage go up?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:worker-protection",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:property-rights",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "housing.vouchers-for-every-eligible-family",
      parameters: [
        { key: "entitlement", value: "yes-or-no" },
        { key: "eligibility", value: "eligible-household-categories" },
      ],
      issue: "us-federal:housing.housing-assistance",
      name: "Housing vouchers for every eligible family",
      question:
        "Should every family that qualifies for a federal housing voucher receive one?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "transport-water.expand-passenger-rail",
      parameters: [
        { key: "appropriation", value: "usd-per-federal-fiscal-year" },
        { key: "coverage", value: "eligible-rail-projects" },
      ],
      issue: "us-federal:transport-water.surface-transport",
      name: "Expand passenger rail",
      question: "Should the federal government pay to expand passenger rail?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.65,
        },
      ],
    },
    {
      key: "energy-environment.limit-power-plant-carbon",
      parameters: [
        { key: "limit", value: "co2-mass-per-electricity-output-unit" },
        { key: "coverage", value: "covered-power-plant-categories" },
      ],
      issue: "us-federal:energy-environment.pollution",
      name: "Limit power plant carbon emissions",
      question: "Should federal law limit carbon emissions from power plants?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "us-policy-positions:public-safety",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:property-rights",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.7,
        },
      ],
    },
    {
      key: "agriculture.cut-farm-subsidies",
      parameters: [
        { key: "cap", value: "usd-per-recipient-per-year" },
        { key: "coverage", value: "covered-payment-programs" },
      ],
      issue: "us-federal:agriculture.producer-support",
      name: "Cut farm subsidies",
      question: "Should federal payments to farmers be cut?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:worker-protection",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:tradition",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "emergencies.states-share-disaster-costs",
      parameters: [
        { key: "share", value: "state-share-of-eligible-disaster-cost" },
        { key: "coverage", value: "covered-disaster-assistance-programs" },
      ],
      issue: "us-federal:emergencies.public-assistance",
      name: "States share more disaster costs",
      question:
        "Should states pay a larger share of the cost of recovering from a disaster?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:local-control",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:collective-provision",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:public-safety",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "justice-rights.reduce-mandatory-minimums",
      parameters: [
        { key: "floor", value: "months-of-custody" },
        { key: "coverage", value: "covered-offense-and-sentence-categories" },
      ],
      issue: "us-federal:justice-rights.federal-justice",
      name: "Reduce mandatory minimum sentences",
      question:
        "Should federal mandatory minimum prison sentences be shortened?",
      consequences: [FEDERAL_MANDATORY_MINIMUM_ROW],
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:personal-liberty",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:equal-treatment",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "us-policy-positions:public-safety",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:tradition",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "government.ban-congressional-stock-trading",
      parameters: [
        { key: "prohibited", value: "yes-or-no" },
        { key: "coverage", value: "covered-persons-assets-and-transactions" },
      ],
      issue: "us-federal:government.public-accountability",
      name: "Ban stock trading by members of Congress",
      question:
        "Should members of Congress be barred from trading individual stocks?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:transparency",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "us-policy-positions:equal-treatment",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "us-policy-positions:personal-liberty",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "us-policy-positions:property-rights",
          bearing: "against",
          weight: 0.65,
        },
      ],
    },
    {
      key: "science-communications.national-data-privacy",
      parameters: [
        { key: "rights", value: "covered-personal-data-rights" },
        { key: "coverage", value: "covered-data-and-businesses" },
      ],
      issue: "us-federal:science-communications.data-cybersecurity",
      name: "National data privacy law",
      question:
        "Should one federal law set the rules for the personal data companies collect?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:personal-liberty",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "us-policy-positions:equal-treatment",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:transparency",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "us-policy-positions:local-control",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "us-policy-positions:market-competition",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "territories-culture.statehood-for-dc",
      parameters: [
        { key: "admitted", value: "yes-or-no" },
        { key: "territory", value: "admitted-territory-boundary" },
      ],
      issue: "us-federal:territories-culture.territories-district",
      name: "Statehood for the District of Columbia",
      question: "Should the District of Columbia become a state?",
      tags: ["contested"],
      principles: [
        {
          principle: "us-policy-positions:equal-treatment",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "us-policy-positions:equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:local-control",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "us-policy-positions:tradition",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "us-policy-positions:limited-government",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
  ],
};
