import type { PolicyPack } from "./policy-packs";
import { RENT_CAP_CONSEQUENCE } from "./law-consequences/rent-cap";

/**
 * Positions a person in the United States can hold, and a bill can be about.
 *
 * **Why this is its own pack, and not rows in the sourced one.** The issue
 * vocabulary in `policy-pack-us-state-and-local.ts` declares `sourced`
 * provenance against named national sources, because those sources really do
 * establish what these governments do. Nothing establishes that any particular
 * *position* is the one to take — a position is a stance, not a finding — so
 * putting these rows under that declaration would claim sources for content
 * that has none. They are authored fiction and say so, and they reference the
 * sourced issues rather than restating them.
 *
 * **What a proposition is here.** One position, put as a question a person can
 * agree or disagree with. Direction lives in the answer and not in the
 * proposition, which is why there is no "oppose" twin for each row: a
 * character who disagrees with "Should the state levy a personal income tax?"
 * has a view, and it is the opposite one. Where a position has a dial rather
 * than a switch — how many weeks, what rate, what share — the dial is a
 * parameter, so one definition covers the whole argument instead of one row
 * per number.
 *
 * **These are not law and must never be read as law.** That a position appears
 * here says a person could hold it, not that any state has adopted it, and
 * nothing here should be rendered to a player as what a jurisdiction does.
 * Whether a real state has acted is a question for the sourced corpora.
 *
 * **Coverage is deliberately partial.** Every domain has positions in it, so
 * no domain is a heading with nothing under it, but many issues have none yet.
 * An issue without a position is reported unused by the loader, which is the
 * honest answer: nobody has authored the argument inside it. That is a gap to
 * fill rather than a defect to silence.
 */

const NOTE =
  "Positions a character can hold and a bill can be about, authored for play " +
  "against the sourced issue vocabulary. No source establishes that any of " +
  "these is the right position or that any jurisdiction has adopted it; each " +
  "is a stance someone could take, written so that agreeing and disagreeing " +
  "are both coherent.";

export const US_POLICY_POSITIONS_PACK: PolicyPack = {
  pack: "us-policy-positions",
  provenance: { kind: "authored-fiction", note: NOTE },
  /**
   * What a person can believe in, above any one question.
   *
   * Fourteen, deliberately, and not one per issue. A principle that only ever
   * turns up on a single question is a restatement of that question, and tells
   * a reader nothing they could not have got from the question itself. These
   * are chosen so that each is engaged by positions in several domains, which
   * is what makes a recorded conviction reach further than the argument it was
   * formed in.
   *
   * They are authored, like the positions, and are a vocabulary for holding a
   * view rather than a claim about what anyone in fact believes.
   */
  principles: [
    {
      key: "limited-government",
      name: "Limited government",
      description:
        "A government should do as little as the job requires, and what it does not need to do it should leave alone.",
    },
    {
      key: "collective-provision",
      name: "Collective provision",
      description:
        "Some things are met better by everyone together than by each household on its own.",
    },
    {
      key: "local-control",
      name: "Local control",
      description:
        "A decision belongs as close as possible to the people who live with it.",
    },
    {
      key: "fiscal-restraint",
      name: "Fiscal restraint",
      description:
        "A government should not promise money it has not got, and should keep what it has put by.",
    },
    {
      key: "equal-treatment",
      name: "Equal treatment",
      description: "The law should fall the same way on everyone it reaches.",
    },
    {
      key: "personal-liberty",
      name: "Personal liberty",
      description:
        "A person should be left to run their own life where it is theirs to run.",
    },
    {
      key: "public-safety",
      name: "Public safety",
      description:
        "Keeping people from harm is the first thing a government is for.",
    },
    {
      key: "property-rights",
      name: "Property rights",
      description:
        "What a person owns is theirs to use, and taking or restricting it needs a strong reason.",
    },
    {
      key: "environmental-stewardship",
      name: "Environmental stewardship",
      description:
        "What is handed on to the people who come next counts as much as what is used now.",
    },
    {
      key: "equal-opportunity",
      name: "Equal opportunity",
      description:
        "Where a person starts should not settle where they can get to.",
    },
    {
      key: "tradition",
      name: "Tradition",
      description:
        "An arrangement that has held for a long time has earned the benefit of the doubt.",
    },
    {
      key: "transparency",
      name: "Transparency",
      description:
        "The public is entitled to see how a decision was reached and by whom.",
    },
    {
      key: "worker-protection",
      name: "Protection for working people",
      description:
        "Someone who works for a living should have the law on their side when bargaining alone would not be enough.",
    },
    {
      key: "market-competition",
      name: "Open competition",
      description:
        "Open competition sorts things out better than direction from above does.",
    },
  ],
  propositions: [
    {
      key: "fiscal.adopt-income-tax",
      parameters: [
        { key: "rate", value: "share-of-taxable-income" },
        { key: "threshold", value: "annual-taxable-income-usd" },
      ],
      issue: "us-state-and-local:fiscal.income-tax",
      name: "Adopt a state income tax",
      question: "Should the state levy a personal income tax?",
      tags: ["revenue", "contested"],
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "fiscal.graduated-income-tax",
      parameters: [
        { key: "brackets", value: "income-thresholds-and-marginal-rates" },
      ],
      issue: "us-state-and-local:fiscal.income-tax",
      name: "Graduated income tax",
      question:
        "Should the personal income tax rise in steps with income rather than apply one flat rate?",
      tags: ["revenue", "contested"],
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "fiscal.cap-property-tax-growth",
      issue: "us-state-and-local:fiscal.property-tax",
      name: "Cap property tax growth",
      question: "Should annual growth in a property tax bill be capped by law?",
      parameters: [{ key: "cap", value: "annual-percentage" }],
      tags: ["contested"],
      principles: [
        {
          principle: "property-rights",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.7,
        },
      ],
    },
    {
      key: "fiscal.exempt-groceries-from-sales-tax",
      parameters: [
        { key: "exempt", value: "yes-or-no" },
        { key: "coverage", value: "covered-food-categories" },
      ],
      issue: "us-state-and-local:fiscal.sales-tax",
      name: "Exempt groceries from sales tax",
      question: "Should groceries be exempt from the general sales tax?",
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "fiscal.balanced-operating-budget",
      parameters: [
        { key: "required", value: "yes-or-no" },
        { key: "scope", value: "covered-operating-funds" },
      ],
      issue: "us-state-and-local:fiscal.operating-budget",
      name: "Require a balanced operating budget",
      question:
        "Should the operating budget be required by law to balance each year?",
      principles: [
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "fiscal.fund-pensions-to-schedule",
      parameters: [
        {
          key: "contribution",
          value: "share-of-actuarially-determined-contribution",
        },
      ],
      issue: "us-state-and-local:fiscal.public-pensions",
      name: "Fund pensions on schedule",
      question:
        "Should the government be required to pay the full actuarial contribution to public pensions each year?",
      tags: ["fiscal-discipline"],
      principles: [
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "property-rights",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "fiscal.minimum-reserve-balance",
      issue: "us-state-and-local:fiscal.reserves",
      name: "Minimum reserve balance",
      question:
        "Should the government be required to hold a reserve equal to a set share of annual spending?",
      parameters: [{ key: "floor", value: "share-of-annual-spending" }],
      principles: [
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "property-rights",
          bearing: "consistent-with",
          weight: 0.4,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "government-operations.independent-redistricting",
      parameters: [
        { key: "authority", value: "district-drawing-body" },
        { key: "coverage", value: "covered-district-types" },
      ],
      issue: "us-state-and-local:government-operations.redistricting",
      name: "Independent redistricting commission",
      question:
        "Should district lines be drawn by an independent commission rather than by the legislature?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.3,
        },
      ],
    },
    {
      key: "government-operations.require-photo-id-to-vote",
      parameters: [
        { key: "required", value: "yes-or-no" },
        { key: "accepted-documents", value: "document-categories" },
        { key: "exceptions", value: "voter-exemption-categories" },
      ],
      issue: "us-state-and-local:government-operations.election-rules",
      name: "Require photo identification to vote",
      question:
        "Should a voter be required to present photo identification at the polls?",
      tags: ["contested"],
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.45,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "government-operations.automatic-voter-registration",
      parameters: [
        { key: "enabled", value: "yes-or-no" },
        { key: "agencies", value: "covered-agencies" },
        { key: "opt-out", value: "registration-opt-out-process" },
      ],
      issue: "us-state-and-local:government-operations.election-administration",
      name: "Automatic voter registration",
      question:
        "Should eligible residents be registered to vote automatically when they deal with a state agency?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "transparency",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "government-operations.legislative-term-limits",
      issue: "us-state-and-local:government-operations.legislative-procedure",
      name: "Limit legislative terms",
      question:
        "Should legislators be limited in how many terms they may serve?",
      parameters: [{ key: "limit", value: "consecutive-terms" }],
      tags: ["contested"],
      principles: [
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.45,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "government-operations.ban-lobbying-after-office",
      issue: "us-state-and-local:government-operations.lobbying-regulation",
      name: "Cooling-off period before lobbying",
      question:
        "Should former officials be barred from lobbying their old body for a set period?",
      parameters: [{ key: "period", value: "years-after-leaving" }],
      principles: [
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.95,
        },
        {
          principle: "worker-protection",
          bearing: "against",
          weight: 0.45,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.35,
        },
      ],
    },
    {
      key: "government-operations.broaden-local-authority",
      parameters: [
        { key: "subjects", value: "delegated-local-subjects" },
        { key: "reserved-subjects", value: "state-reserved-subjects" },
      ],
      issue: "us-state-and-local:government-operations.state-local-powers",
      name: "Broaden local authority",
      question:
        "Should localities be free to act on matters the state has not expressly reserved to itself?",
      tags: ["home-rule", "contested"],
      principles: [
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "education.equalize-school-funding",
      parameters: [
        { key: "floor", value: "annual-usd-per-pupil" },
        { key: "formula", value: "district-allocation-rule" },
      ],
      issue: "us-state-and-local:education.school-funding",
      name: "Equalize school funding across districts",
      question:
        "Should the state equalize per-student funding so that a district's wealth does not determine what its schools spend?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "education.public-funds-for-private-schooling",
      parameters: [
        { key: "award", value: "annual-usd-per-student" },
        { key: "eligibility", value: "eligible-student-and-school-categories" },
      ],
      issue: "us-state-and-local:education.school-choice",
      name: "Public funds for private schooling",
      question:
        "Should public money follow a student to a private school their family chooses?",
      tags: ["contested"],
      principles: [
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "market-competition",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "transparency",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.65,
        },
      ],
    },
    {
      key: "education.raise-teacher-minimum-salary",
      parameters: [{ key: "floor", value: "annual-usd-per-full-time-teacher" }],
      issue: "us-state-and-local:education.teacher-workforce",
      name: "Raise the teacher salary floor",
      question:
        "Should the state set a minimum salary for teachers above the current floor?",
      principles: [
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "education.universal-preschool",
      parameters: [
        { key: "eligible-ages", value: "years-of-age" },
        { key: "funding", value: "annual-usd-per-enrollee" },
      ],
      issue: "us-state-and-local:education.early-childhood",
      name: "Universal preschool",
      question:
        "Should the state fund preschool for every child whose family wants a place?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.5,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "education.freeze-public-tuition",
      parameters: [
        { key: "cap", value: "annual-tuition-usd" },
        { key: "coverage", value: "public-institution-and-student-categories" },
      ],
      issue: "us-state-and-local:education.higher-education-tuition-and-aid",
      name: "Freeze public college tuition",
      question: "Should tuition at public colleges be frozen?",
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "education.state-curriculum-standards",
      parameters: [
        { key: "authority", value: "standards-adopting-body" },
        { key: "coverage", value: "covered-grades-and-subjects" },
      ],
      issue: "us-state-and-local:education.curriculum-and-standards",
      name: "Set curriculum at the state level",
      question:
        "Should the state set curriculum standards that every district must follow?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.95,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.5,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "health-human-services.expand-medicaid-eligibility",
      parameters: [
        { key: "income-limit", value: "share-of-federal-poverty-level" },
        { key: "eligibility", value: "covered-person-categories" },
      ],
      issue: "us-state-and-local:health-human-services.medicaid",
      name: "Expand Medicaid eligibility",
      question:
        "Should Medicaid eligibility be expanded to more low-income adults?",
      tags: ["contested"],
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.7,
        },
      ],
    },
    {
      key: "health-human-services.medicaid-work-requirement",
      parameters: [
        { key: "hours", value: "qualifying-hours-per-month" },
        { key: "exemptions", value: "exempt-person-categories" },
      ],
      issue: "us-state-and-local:health-human-services.medicaid",
      name: "Work requirement for Medicaid",
      question:
        "Should able adults be required to work, train or study a set number of hours a month to keep Medicaid?",
      tags: ["contested"],
      principles: [
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "health-human-services.work-requirement-for-assistance",
      parameters: [
        { key: "hours", value: "qualifying-hours-per-month" },
        { key: "coverage", value: "covered-assistance-programs" },
        { key: "exemptions", value: "exempt-person-categories" },
      ],
      issue:
        "us-state-and-local:health-human-services.food-and-income-assistance",
      name: "Work requirement for assistance",
      question:
        "Should able adults be required to work or train to keep income and food assistance?",
      tags: ["contested"],
      principles: [
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "worker-protection",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "health-human-services.fund-behavioral-health-crisis-response",
      parameters: [
        { key: "appropriation", value: "usd-per-budget-year" },
        { key: "coverage", value: "covered-service-area-and-responses" },
      ],
      issue: "us-state-and-local:health-human-services.behavioral-health",
      name: "Fund a behavioral health crisis response",
      question:
        "Should the state fund a crisis response for mental health emergencies separate from police?",
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "health-human-services.harm-reduction-services",
      parameters: [
        { key: "appropriation", value: "usd-per-budget-year" },
        { key: "services", value: "authorized-service-categories" },
      ],
      issue: "us-state-and-local:health-human-services.substance-use",
      name: "Harm reduction services",
      question:
        "Should the state fund needle exchange and overdose reversal distribution?",
      tags: ["contested"],
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "health-human-services.housing-first-homelessness",
      parameters: [
        { key: "treatment-precondition", value: "yes-or-no" },
        { key: "eligibility", value: "eligible-household-categories" },
      ],
      issue: "us-state-and-local:health-human-services.homelessness-services",
      name: "Housing first",
      question:
        "Should homelessness services place people in housing before requiring treatment or sobriety?",
      tags: ["contested"],
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.75,
        },
      ],
    },
    {
      key: "justice-public-safety.end-cash-bail",
      parameters: [
        { key: "money-condition", value: "yes-or-no" },
        { key: "coverage", value: "covered-charge-and-defendant-categories" },
      ],
      issue: "us-state-and-local:justice-public-safety.courts",
      name: "End cash bail",
      question: "Should release before trial be decided without money bail?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.45,
        },
        {
          principle: "public-safety",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "justice-public-safety.mandatory-minimum-sentences",
      parameters: [
        { key: "floor", value: "months-of-custody" },
        {
          key: "coverage",
          value: "covered-offense-categories",
          allowedValues: ["assault", "robbery", "burglary", "vandalism"],
        },
      ],
      issue:
        "us-state-and-local:justice-public-safety.criminal-law-and-sentencing",
      name: "Mandatory minimum sentences",
      question:
        "Should the law set minimum sentences that a judge may not go below?",
      tags: ["contested"],
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.45,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "justice-public-safety.civilian-oversight-of-police",
      parameters: [
        { key: "powers", value: "investigation-and-enforcement-powers" },
        { key: "coverage", value: "covered-agencies" },
      ],
      issue: "us-state-and-local:justice-public-safety.policing",
      name: "Civilian oversight of police",
      question:
        "Should a civilian board have authority to investigate complaints against police?",
      tags: ["contested"],
      principles: [
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "worker-protection",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "justice-public-safety.permit-to-carry-concealed",
      parameters: [
        { key: "required", value: "yes-or-no" },
        { key: "eligibility", value: "eligible-applicant-categories" },
      ],
      issue: "us-state-and-local:justice-public-safety.firearms",
      name: "Require a permit to carry concealed",
      question: "Should carrying a concealed firearm require a permit?",
      tags: ["contested"],
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.45,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.75,
        },
      ],
    },
    {
      key: "justice-public-safety.raise-juvenile-court-age",
      issue: "us-state-and-local:justice-public-safety.juvenile-justice",
      name: "Raise the juvenile court age",
      question:
        "Should older teenagers be handled in juvenile rather than adult court?",
      parameters: [{ key: "age", value: "upper-age-of-juvenile-jurisdiction" }],
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "public-safety",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.45,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "justice-public-safety.restore-voting-after-sentence",
      parameters: [
        { key: "restoration-event", value: "sentence-completion-stage" },
        { key: "coverage", value: "eligible-person-categories" },
      ],
      issue: "us-state-and-local:justice-public-safety.reentry",
      name: "Restore voting after a sentence",
      question:
        "Should voting rights be restored automatically once a sentence is complete?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "public-safety",
          bearing: "against",
          weight: 0.35,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.3,
        },
      ],
    },
    {
      key: "housing-land-use.allow-multifamily-in-single-family-zones",
      parameters: [
        { key: "units", value: "dwellings-per-parcel" },
        { key: "coverage", value: "covered-zones-and-parcels" },
      ],
      // A housing-supply question: states answer it too, overriding local
      // zoning (Oregon, California, Washington, Montana, Maine, Vermont, Arizona).
      issue: "us-state-and-local:housing-land-use.housing-supply",
      name: "Allow multifamily housing in single-family zones",
      question:
        "Should small multifamily housing be allowed by right in areas zoned for single-family homes?",
      tags: ["contested"],
      principles: [
        {
          principle: "property-rights",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "market-competition",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.7,
        },
      ],
    },
    {
      key: "housing-land-use.rent-stabilization",
      consequences: [RENT_CAP_CONSEQUENCE],
      parameters: [
        { key: "cap", value: "annual-percentage-increase" },
        { key: "coverage", value: "covered-tenancy-and-building-categories" },
      ],
      issue: "us-state-and-local:housing-land-use.tenant-and-landlord-rules",
      name: "Rent stabilization",
      question:
        "Should annual rent increases on existing tenancies be limited by law?",
      tags: ["contested"],
      principles: [
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.85,
        },
      ],
    },
    {
      key: "housing-land-use.by-right-permitting",
      parameters: [
        { key: "approval", value: "ministerial-or-discretionary" },
        { key: "coverage", value: "qualifying-project-categories" },
      ],
      issue: "us-state-and-local:housing-land-use.permitting",
      name: "By-right permitting",
      question:
        "Should housing that meets the zoning code be approved without discretionary review?",
      principles: [
        {
          principle: "property-rights",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "market-competition",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "transparency",
          bearing: "against",
          weight: 0.65,
        },
      ],
    },
    {
      key: "housing-land-use.inclusionary-requirement",
      parameters: [
        { key: "share", value: "share-of-new-homes" },
        { key: "income-limit", value: "share-of-area-median-income" },
      ],
      issue: "us-state-and-local:housing-land-use.housing-affordability",
      name: "Inclusionary housing requirement",
      question:
        "Should new developments be required to include below-market homes?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.75,
        },
      ],
    },
    {
      key: "housing-land-use.preempt-local-housing-limits",
      parameters: [
        { key: "subjects", value: "preempted-local-restrictions" },
        { key: "coverage", value: "covered-localities" },
      ],
      issue: "us-state-and-local:housing-land-use.state-housing-preemption",
      name: "Preempt local housing limits",
      question: "Should the state override local rules that block housing?",
      tags: ["contested"],
      principles: [
        {
          principle: "market-competition",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "property-rights",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.95,
        },
        {
          principle: "transparency",
          bearing: "against",
          weight: 0.65,
        },
      ],
    },
    {
      key: "housing-land-use.right-to-counsel-in-eviction",
      parameters: [
        { key: "income-limit", value: "share-of-federal-poverty-level" },
        { key: "coverage", value: "covered-proceeding-categories" },
      ],
      issue: "us-state-and-local:housing-land-use.tenant-and-landlord-rules",
      name: "Right to counsel in eviction",
      question: "Should a tenant facing eviction be provided a lawyer?",
      principles: [
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "transportation-infrastructure.shift-highway-funds-to-transit",
      parameters: [
        { key: "share", value: "share-of-eligible-transport-funding" },
        { key: "coverage", value: "eligible-funding-programs" },
      ],
      issue: "us-state-and-local:transportation-infrastructure.transit",
      name: "Shift highway funds to transit",
      question:
        "Should money currently dedicated to highways be available for transit?",
      tags: ["contested"],
      principles: [
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.45,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.35,
        },
      ],
    },
    {
      key: "transportation-infrastructure.additional-rural-transit-service-hours",
      parameters: [
        { key: "appropriation", value: "usd-per-budget-year" },
        { key: "service", value: "additional-vehicle-service-hours" },
      ],
      issue: "us-state-and-local:transportation-infrastructure.transit",
      name: "Additional rural transit service hours",
      question:
        "Should the state appropriate money for additional rural transit service hours?",
      tags: ["contested", "appropriation"],
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.35,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "transportation-infrastructure.fare-free-transit",
      parameters: [
        { key: "fare", value: "usd-per-ride" },
        { key: "coverage", value: "covered-services-and-riders" },
      ],
      issue: "us-state-and-local:transportation-infrastructure.transit",
      name: "Fare-free transit",
      question: "Should local transit be free to ride?",
      tags: ["contested"],
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "transportation-infrastructure.mileage-fee-replaces-fuel-tax",
      parameters: [
        { key: "rate", value: "usd-per-vehicle-mile" },
        { key: "coverage", value: "covered-vehicle-categories" },
      ],
      issue:
        "us-state-and-local:transportation-infrastructure.roads-and-bridges",
      name: "Mileage fee instead of fuel tax",
      question: "Should a per-mile road charge replace the fuel tax?",
      tags: ["contested"],
      principles: [
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "environmental-stewardship",
          bearing: "against",
          weight: 0.4,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.35,
        },
      ],
    },
    {
      key: "transportation-infrastructure.public-broadband",
      parameters: [
        { key: "authorized", value: "yes-or-no" },
        { key: "coverage", value: "authorized-public-providers" },
      ],
      issue: "us-state-and-local:transportation-infrastructure.broadband",
      name: "Public broadband",
      question:
        "Should local governments be allowed to build and sell broadband service?",
      tags: ["contested"],
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "transportation-infrastructure.fix-it-first",
      parameters: [
        { key: "priority", value: "maintenance-before-expansion-rule" },
        { key: "coverage", value: "covered-capital-programs" },
      ],
      issue:
        "us-state-and-local:transportation-infrastructure.capital-construction-and-maintenance",
      name: "Fix it first",
      question:
        "Should maintenance of existing infrastructure be funded before new construction?",
      tags: ["local-fiscal-effect:public-program-appropriation"],
      principles: [
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.4,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.3,
        },
      ],
    },
    {
      key: "business-commerce.reduce-occupational-licensing",
      parameters: [
        { key: "exemptions", value: "occupations-exempt-from-licensing" },
        { key: "coverage", value: "retained-safety-requirements" },
      ],
      issue: "us-state-and-local:business-commerce.occupational-licensing",
      name: "Reduce occupational licensing",
      question:
        "Should the state remove licensing requirements from occupations that do not need them for safety?",
      tags: ["contested"],
      principles: [
        {
          principle: "market-competition",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "public-safety",
          bearing: "against",
          weight: 0.85,
        },
      ],
    },
    {
      key: "business-commerce.legalize-cannabis-sales",
      parameters: [
        { key: "authorized", value: "yes-or-no" },
        { key: "minimum-age", value: "years-of-age" },
        { key: "tax-rate", value: "share-of-taxable-sales" },
      ],
      issue: "us-state-and-local:business-commerce.alcohol-cannabis-gaming",
      name: "Legalize cannabis sales",
      question: "Should the sale of cannabis to adults be legal and regulated?",
      tags: ["contested"],
      principles: [
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "market-competition",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "public-safety",
          bearing: "against",
          weight: 0.75,
        },
      ],
    },
    {
      key: "business-commerce.cap-development-incentives",
      parameters: [
        { key: "cap", value: "usd-per-award" },
        { key: "disclosure", value: "required-award-disclosures" },
      ],
      issue: "us-state-and-local:business-commerce.development-incentives",
      name: "Cap development incentives",
      question:
        "Should tax incentives offered to attract employers be capped and disclosed?",
      principles: [
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "business-commerce.cap-consumer-loan-rates",
      issue: "us-state-and-local:business-commerce.banking-and-credit",
      name: "Cap consumer loan rates",
      question: "Should interest on small consumer loans be capped?",
      parameters: [{ key: "cap", value: "annual-percentage-rate" }],
      tags: ["contested"],
      principles: [
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.65,
        },
      ],
    },
    {
      key: "labor-workforce.raise-minimum-wage",
      issue: "us-state-and-local:labor-workforce.minimum-wage",
      name: "Raise the minimum wage",
      question:
        "Should the state minimum wage be raised above the federal floor?",
      parameters: [{ key: "target", value: "hourly-rate" }],
      tags: ["contested"],
      principles: [
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.65,
        },
      ],
    },
    {
      key: "labor-workforce.local-minimum-wage-authority",
      parameters: [
        { key: "authorized", value: "yes-or-no" },
        { key: "coverage", value: "covered-localities" },
      ],
      issue: "us-state-and-local:labor-workforce.minimum-wage",
      name: "Let localities set their own minimum wage",
      question:
        "Should a city be allowed to set a minimum wage higher than the state's?",
      tags: ["contested"],
      principles: [
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "labor-workforce.paid-family-leave",
      parameters: [
        { key: "duration", value: "weeks-of-paid-leave" },
        { key: "replacement", value: "share-of-covered-weekly-wages" },
      ],
      issue: "us-state-and-local:labor-workforce.leave-policy",
      name: "Paid family and medical leave",
      question: "Should the state run a paid family and medical leave program?",
      tags: ["contested"],
      principles: [
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "labor-workforce.public-sector-collective-bargaining",
      parameters: [
        { key: "authorized", value: "yes-or-no" },
        { key: "coverage", value: "covered-public-employee-categories" },
      ],
      issue: "us-state-and-local:labor-workforce.collective-bargaining",
      name: "Public-sector collective bargaining",
      question:
        "Should public employees have the right to bargain collectively?",
      tags: ["contested"],
      principles: [
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "labor-workforce.right-to-work",
      parameters: [
        { key: "fee-prohibition", value: "yes-or-no" },
        { key: "coverage", value: "covered-employment-categories" },
      ],
      issue: "us-state-and-local:labor-workforce.collective-bargaining",
      name: "Right to work",
      question:
        "Should workers be barred from having to pay union fees as a condition of employment?",
      tags: ["contested"],
      principles: [
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "market-competition",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "worker-protection",
          bearing: "against",
          weight: 0.95,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "environment-energy.clean-electricity-standard",
      issue: "us-state-and-local:environment-energy.energy-generation-and-grid",
      name: "Clean electricity standard",
      question:
        "Should electricity providers be required to meet a rising clean-generation standard?",
      parameters: [{ key: "target", value: "share-by-year" }],
      tags: ["contested"],
      principles: [
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "environment-energy.price-carbon",
      parameters: [
        { key: "price", value: "usd-per-tonne-co2-equivalent" },
        { key: "coverage", value: "covered-emissions" },
      ],
      issue: "us-state-and-local:environment-energy.climate-mitigation",
      name: "Price carbon emissions",
      question: "Should the state put a price on carbon emissions?",
      tags: ["contested"],
      principles: [
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "market-competition",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "environment-energy.ban-new-gas-hookups",
      parameters: [
        { key: "prohibited", value: "yes-or-no" },
        { key: "coverage", value: "covered-new-building-categories" },
      ],
      issue: "us-state-and-local:environment-energy.energy-efficiency",
      name: "Ban new gas hookups",
      question:
        "Should new buildings be barred from connecting to natural gas?",
      tags: ["contested"],
      principles: [
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.7,
        },
      ],
    },
    {
      key: "environment-energy.restrict-building-in-flood-zones",
      parameters: [
        { key: "risk-threshold", value: "flood-risk-classification" },
        { key: "coverage", value: "covered-development-categories" },
      ],
      issue: "us-state-and-local:environment-energy.climate-resilience",
      name: "Restrict building in flood zones",
      question:
        "Should new construction be restricted in areas at high risk of flooding?",
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.5,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "environment-energy.bottle-deposit",
      parameters: [
        { key: "deposit", value: "usd-per-container" },
        { key: "coverage", value: "covered-container-categories" },
      ],
      issue: "us-state-and-local:environment-energy.waste-and-recycling",
      name: "Container deposit",
      question: "Should beverage containers carry a refundable deposit?",
      principles: [
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.35,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "agriculture-natural-resources.limit-groundwater-withdrawal",
      parameters: [
        { key: "cap", value: "water-volume-per-permit-period" },
        { key: "coverage", value: "covered-aquifers-and-users" },
      ],
      issue:
        "us-state-and-local:agriculture-natural-resources.water-allocation",
      name: "Limit groundwater withdrawal",
      question: "Should groundwater withdrawals be metered and limited?",
      tags: ["contested"],
      principles: [
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "agriculture-natural-resources.protect-farmland-from-development",
      parameters: [
        { key: "appropriation", value: "usd-per-budget-year" },
        { key: "coverage", value: "eligible-parcels-and-easements" },
      ],
      issue:
        "us-state-and-local:agriculture-natural-resources.farming-and-ranching",
      name: "Protect farmland from development",
      question: "Should the state pay to keep farmland from being developed?",
      principles: [
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "agriculture-natural-resources.expand-public-land-access",
      parameters: [
        { key: "access", value: "permitted-recreation-categories" },
        { key: "coverage", value: "covered-public-parcels" },
      ],
      issue: "us-state-and-local:agriculture-natural-resources.public-lands",
      name: "Expand public land access",
      question: "Should public land be opened to more recreational access?",
      principles: [
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "environmental-stewardship",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "civil-family-community.ban-discrimination-in-housing-and-work",
      parameters: [
        {
          key: "protected-grounds",
          value: "protected-characteristic-categories",
        },
        { key: "coverage", value: "covered-housing-and-employment" },
      ],
      issue:
        "us-state-and-local:civil-family-community.civil-rights-and-discrimination",
      name: "Ban discrimination in housing and employment",
      question:
        "Should state law bar discrimination in housing and employment on grounds it does not currently cover?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "civil-family-community.restrict-abortion",
      issue: "us-state-and-local:civil-family-community.reproductive-policy",
      name: "Restrict abortion",
      question:
        "Should abortion be prohibited after a set point in pregnancy, subject to listed exceptions?",
      parameters: [{ key: "general-limit", value: "weeks-of-pregnancy" }],
      tags: ["contested"],
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.95,
        },
        {
          principle: "public-safety",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "civil-family-community.fund-public-libraries",
      parameters: [
        { key: "floor", value: "annual-usd-per-library-service-population" },
        { key: "coverage", value: "eligible-public-library-systems" },
      ],
      issue: "us-state-and-local:civil-family-community.libraries",
      name: "Fund public libraries",
      question:
        "Should the state guarantee a funding floor for public libraries?",
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "civil-family-community.local-control-of-library-materials",
      parameters: [
        { key: "authority", value: "collection-decision-body" },
        { key: "coverage", value: "covered-library-systems" },
      ],
      issue: "us-state-and-local:civil-family-community.libraries",
      name: "Local control of library materials",
      question:
        "Should decisions about which materials a library carries rest with local boards?",
      tags: ["contested"],
      principles: [
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.55,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "equal-opportunity",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.35,
        },
      ],
    },
    {
      key: "civil-family-community.dedicated-parks-funding",
      parameters: [
        { key: "share", value: "share-of-designated-revenue" },
        { key: "coverage", value: "eligible-parks-and-recreation-programs" },
      ],
      issue: "us-state-and-local:civil-family-community.parks-and-recreation",
      name: "Dedicated parks funding",
      question:
        "Should a fixed share of revenue be dedicated to parks and recreation?",
      principles: [
        {
          principle: "collective-provision",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "technology-privacy.consumer-data-privacy-law",
      parameters: [
        { key: "rights", value: "covered-consumer-data-rights" },
        { key: "coverage", value: "covered-data-and-businesses" },
      ],
      issue: "us-state-and-local:technology-privacy.privacy-and-data-use",
      name: "Consumer data privacy law",
      question:
        "Should residents have a legal right to see, correct and delete data companies hold about them?",
      tags: ["contested"],
      principles: [
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.65,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.6,
        },
      ],
    },
    {
      key: "technology-privacy.restrict-government-facial-recognition",
      parameters: [
        {
          key: "restrictions",
          value: "permitted-and-prohibited-use-categories",
        },
        { key: "coverage", value: "covered-government-agencies" },
      ],
      issue: "us-state-and-local:technology-privacy.artificial-intelligence",
      name: "Restrict government facial recognition",
      question: "Should government use of facial recognition be restricted?",
      tags: ["contested"],
      principles: [
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "public-safety",
          bearing: "against",
          weight: 0.85,
        },
      ],
    },
    {
      key: "technology-privacy.age-verification-for-social-media",
      parameters: [
        { key: "minimum-age", value: "years-of-age" },
        { key: "coverage", value: "covered-platform-and-user-categories" },
      ],
      issue: "us-state-and-local:technology-privacy.platforms-and-social-media",
      name: "Age verification for social media",
      question:
        "Should social media platforms be required to verify a user's age?",
      tags: ["contested"],
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.6,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "transparency",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    // A city's own versions of four state questions: its own wage floor, its
    // own fairness ordinance, its own council's terms and its own wards.
    // Whether the state lets it act is the state's answer, not the city's
    // (data/research/powers-catalog/question-powers.json).
    {
      key: "labor-workforce.city-minimum-wage",
      issue: "us-state-and-local:labor-workforce.minimum-wage",
      name: "City minimum wage",
      question: "Should the city set its own minimum wage above the state's?",
      parameters: [{ key: "target", value: "hourly-rate" }],
      tags: ["contested"],
      principles: [
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "civil-family-community.city-nondiscrimination-ordinance",
      parameters: [
        {
          key: "protected-grounds",
          value: "protected-characteristic-categories",
        },
        { key: "coverage", value: "covered-local-housing-and-employment" },
      ],
      issue:
        "us-state-and-local:civil-family-community.civil-rights-and-discrimination",
      name: "City nondiscrimination ordinance",
      question:
        "Should the city bar discrimination in housing and employment on grounds state law does not cover?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "worker-protection",
          bearing: "consistent-with",
          weight: 0.75,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.75,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "government-operations.council-term-limits",
      issue: "us-state-and-local:government-operations.legislative-procedure",
      name: "Limit council terms",
      question:
        "Should members of the city council be limited in how many terms they may serve?",
      parameters: [{ key: "limit", value: "consecutive-terms" }],
      tags: ["contested"],
      principles: [
        {
          principle: "limited-government",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "local-control",
          bearing: "consistent-with",
          weight: 0.45,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.9,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.7,
        },
        {
          principle: "collective-provision",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "government-operations.independent-ward-commission",
      parameters: [
        { key: "authority", value: "ward-drawing-body" },
        { key: "coverage", value: "covered-council-districts" },
      ],
      issue: "us-state-and-local:government-operations.redistricting",
      name: "Independent ward commission",
      question:
        "Should the city's council districts be drawn by an independent commission rather than by the council?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.95,
        },
        {
          principle: "transparency",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "local-control",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.35,
        },
      ],
    },
    // Seven laws the outcome web already has researched effects for
    // (data/research/outcome-web/links.json) but no question asked about, so
    // nobody could pass them and no effect could run. Each question's key is
    // the one its links read as `law:us-policy-positions:<key>`; each place's
    // law on it is in data/research/laws/starting-law-2026.json; the reason
    // behind each bearing is in
    // docs/codex/effect-batches/claude-new-questions/ideology.json.
    {
      key: "justice-public-safety.stand-your-ground",
      issue:
        "us-state-and-local:justice-public-safety.criminal-law-and-sentencing",
      name: "Stand your ground",
      question:
        "Should a person who fears death or serious harm in a public place be free to use deadly force without first trying to retreat?",
      tags: ["contested"],
      principles: [
        {
          principle: "personal-liberty",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "tradition",
          bearing: "consistent-with",
          weight: 0.4,
        },
        {
          principle: "public-safety",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.55,
        },
      ],
    },
    {
      key: "justice-public-safety.child-access-prevention",
      issue: "us-state-and-local:justice-public-safety.firearms",
      name: "Responsibility for unsecured guns near children",
      question:
        "Should a gun owner be held responsible when a child can get at an unsecured gun, even if no one is hurt?",
      tags: ["contested"],
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.65,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "justice-public-safety.raise-handgun-purchase-age",
      issue: "us-state-and-local:justice-public-safety.firearms",
      name: "Handgun buyers must be 21",
      question:
        "Should a person have to be 21 to buy a handgun, from any seller?",
      tags: ["contested"],
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.85,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.85,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.5,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "government-operations.same-day-voter-registration",
      issue: "us-state-and-local:government-operations.election-rules",
      name: "Same-day voter registration",
      question:
        "Should a person be able to register to vote and cast a ballot on the same day, even after the regular registration deadline?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "equal-treatment",
          bearing: "consistent-with",
          weight: 0.5,
        },
        {
          principle: "transparency",
          bearing: "against",
          weight: 0.5,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.4,
        },
      ],
    },
    {
      key: "government-operations.all-mail-voting",
      issue: "us-state-and-local:government-operations.election-administration",
      name: "Ballots mailed to every voter",
      question:
        "Should every registered voter be mailed a ballot automatically for each election?",
      tags: ["contested"],
      principles: [
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.8,
        },
        {
          principle: "fiscal-restraint",
          bearing: "consistent-with",
          weight: 0.4,
        },
        {
          principle: "tradition",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "transparency",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
    {
      key: "justice-public-safety.partner-with-federal-immigration-enforcement",
      issue: "us-state-and-local:justice-public-safety.policing",
      name: "Local police partner with federal immigration enforcement",
      question:
        "Should local police and sheriffs sign 287(g) agreements with federal immigration authorities to help enforce immigration law?",
      tags: ["contested"],
      principles: [
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "equal-treatment",
          bearing: "against",
          weight: 0.8,
        },
        {
          principle: "personal-liberty",
          bearing: "against",
          weight: 0.6,
        },
        {
          principle: "limited-government",
          bearing: "against",
          weight: 0.45,
        },
      ],
    },
    {
      key: "environment-energy.clean-air-plan-for-polluted-counties",
      issue: "us-state-and-local:environment-energy.air-quality",
      name: "Clean-air plan for counties that fail federal standards",
      question:
        "Should the state enforce a clean-up plan, with emission limits on polluters, in counties that fail the federal soot and dust standards?",
      tags: ["contested"],
      principles: [
        {
          principle: "environmental-stewardship",
          bearing: "consistent-with",
          weight: 0.9,
        },
        {
          principle: "public-safety",
          bearing: "consistent-with",
          weight: 0.7,
        },
        {
          principle: "equal-opportunity",
          bearing: "consistent-with",
          weight: 0.45,
        },
        {
          principle: "property-rights",
          bearing: "against",
          weight: 0.55,
        },
        {
          principle: "market-competition",
          bearing: "against",
          weight: 0.5,
        },
        {
          principle: "fiscal-restraint",
          bearing: "against",
          weight: 0.5,
        },
      ],
    },
  ],
};
