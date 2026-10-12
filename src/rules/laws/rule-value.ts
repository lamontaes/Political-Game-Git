/** Frozen bounds and exact public validation; helper travels with its owner. */
import type {
  NominationMethodChoice,
  RuleChangeApplicability,
  RuleChangeValue,
} from "../../simulation/enacted-rule-changes";
import { isElectionDateRule } from "../elections/date-rules";
import type { MunicipalRecallDoctrine } from "../../simulation/municipal-election-rules";
export type AmendableRuleField = keyof typeof AMENDABLE_RULE_FIELDS;
export const AMENDABLE_RULE_FIELDS = {
  "body.seats": { kind: "integer", min: 1, max: 1000, family: "legislature" },
  "term.years": { kind: "integer", min: 1, max: 10, family: "legislature" },
  "qualification.minimumAge": {
    kind: "integer",
    min: 18,
    max: 100,
    family: "legislature",
  },
  "qualification.stateResidenceYears": {
    kind: "integer",
    min: 0,
    max: 30,
    family: "legislature",
  },
  "qualification.districtResidenceYears": {
    kind: "integer",
    min: 0,
    max: 30,
    family: "legislature",
  },
  "executive.term.years": {
    kind: "integer",
    min: 1,
    max: 10,
    family: "executive",
  },
  "executive.term.limit": { kind: "term-limit", family: "executive" },
  "municipal.recall.doctrine": {
    kind: "choice",
    options: [
      "two-question-standalone",
      "simultaneous-incumbent-replacement",
      "yes-no-retention",
      "judicial-cause-removal-trial",
      "prohibited",
    ] satisfies readonly MunicipalRecallDoctrine[],
    family: "municipal",
  },
  "labor.minimumWage.hourlyCents": {
    kind: "integer",
    min: 0,
    max: 100000,
    family: "labor",
  },
  "court.seats": { kind: "integer", min: 1, max: 99, family: "judiciary" },
  "senate.selection": {
    kind: "choice",
    options: ["popular-vote", "state-legislature"],
    family: "senate",
  },
  "pay.governor.annualDollars": {
    kind: "integer",
    min: 0,
    max: 10000000,
    family: "pay",
  },
  "pay.stateLegislator.annualDollars": {
    kind: "integer",
    min: 0,
    max: 10000000,
    family: "pay",
  },
  "pay.trialJudge.annualDollars": {
    kind: "integer",
    min: 0,
    max: 10000000,
    family: "pay",
  },
  "nomination.primary.dateRule": { kind: "date-rule", family: "election" },
  "nomination.method": {
    kind: "choice",
    options: [
      "party-primary",
      "top-two",
      "top-four",
      "all-party-majority",
    ] satisfies readonly NominationMethodChoice[],
    family: "election",
  },
} as const;

export const NOT_YET_AMENDABLE_RULE_FIELDS: Readonly<Record<string, string>> = {
  "term.start":
    "A term's commencement is a date rule with several shapes; enacting a new one is not modeled yet.",
  "term.expiry":
    "A term's end follows from its length and start; change the length instead.",
  "election.date":
    "The game has no compiled state election calendar to amend; elections run on the game's own calendar.",
  "election.cycle":
    "The game has no compiled state election calendar to amend; elections run on the game's own calendar.",
  "institution.form":
    "Changing the form of a legislature (for example to unicameral) is not modeled yet.",
  "ordinance.passage":
    "Local ordinance procedure is changed by charter, and charter changes are not routed here yet.",
  "ordinance.introductionToPassage":
    "Local ordinance procedure is changed by charter, and charter changes are not routed here yet.",
  "ordinance.effective":
    "Local ordinance procedure is changed by charter, and charter changes are not routed here yet.",
  "finance.appropriationVote":
    "Local appropriation votes are changed by charter, and charter changes are not routed here yet.",
};

export function isAmendableRuleField(
  field: string,
): field is AmendableRuleField {
  return Object.hasOwn(AMENDABLE_RULE_FIELDS, field);
}

// stopgapId: "laws.rule-silent-applicability"
export const SILENT: RuleChangeApplicability = {
  appliesTo: null,
  countsPriorService: null,
};

function wholeOrNull(value: unknown, min: number): boolean {
  return (
    value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= min)
  );
}

// stopgapId: "laws.rule-value-envelope"
export function assertAmendableRuleValue(
  field: string,
  value: RuleChangeValue,
  officeKey: string | null,
  applicability?: RuleChangeApplicability,
): asserts field is AmendableRuleField {
  if (!isAmendableRuleField(field)) {
    throw new Error(
      NOT_YET_AMENDABLE_RULE_FIELDS[field] ??
        `"${field}" is not a rule the game reads.`,
    );
  }
  const spec = AMENDABLE_RULE_FIELDS[field];
  if (spec.kind === "integer") {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < spec.min ||
      value > spec.max
    ) {
      throw new Error(
        `${field} must be a whole number from ${spec.min} to ${spec.max}.`,
      );
    }
  } else if (spec.kind === "date-rule") {
    if (!isElectionDateRule(value) || value.kind === "days-after-primary") {
      throw new Error(`${field} must be a date rule the game can read.`);
    }
  } else if (spec.kind === "choice") {
    if (
      typeof value !== "string" ||
      !(spec.options as readonly string[]).includes(value)
    ) {
      throw new Error(`${field} must be one of: ${spec.options.join(", ")}.`);
    }
  } else if (value !== null) {
    const keys =
      typeof value === "object" ? Object.keys(value).sort().join(",") : "";
    if (
      typeof value !== "object" ||
      !("maxConsecutiveTerms" in value) ||
      keys !== "lookbackYears,maxConsecutiveTerms,maxLifetimeTerms" ||
      !wholeOrNull(value.maxConsecutiveTerms, 1) ||
      !wholeOrNull(value.maxLifetimeTerms, 1) ||
      !wholeOrNull(value.lookbackYears, 1) ||
      (value.maxConsecutiveTerms === null && value.maxLifetimeTerms === null)
    ) {
      throw new Error(
        `${field} must be null (no limit) or a limit naming consecutive or lifetime terms as whole numbers.`,
      );
    }
  }
  if (!officeKey?.trim()) {
    throw new Error(
      `${field} belongs to an office or chamber; none was named.`,
    );
  }
  if (applicability) {
    if (
      ![null, "terms-beginning-after", "immediately"].includes(
        applicability.appliesTo,
      ) ||
      ![null, true, false].includes(applicability.countsPriorService) ||
      Object.keys(applicability).length !== 2
    ) {
      throw new Error("A change's applicability is not one the game reads.");
    }
  }
}
