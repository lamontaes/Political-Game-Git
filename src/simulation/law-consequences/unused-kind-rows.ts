import type { LawConsequenceRow } from "../law-consequence-types";

const evidence = {
  sourceIds: ["data/research/policy/positions-us.json"],
  population: "People and institutions recorded in the governing jurisdiction.",
  scope:
    "The operative term in the enacted law controls the recorded permission or rule.",
  why: "The policy question names the permission or institution rule changed by the bill.",
  uncertainty:
    "A bill with no applicable final term produces no permission or rule binding.",
} as const;

function permissionRow(
  id: string,
  selector:
    | "recorded-person-permission"
    | "recorded-organization-permission"
    | "recorded-town-retail-permission",
  when: "effective" | "application" = "effective",
): LawConsequenceRow {
  return {
    id,
    kind: "right-permission",
    when,
    who: { selector, predicates: [] },
    what: "permit-on-yes",
    decision: { op: "term", key: "law-answer", type: "boolean" },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "recompute-prospective",
    evidence,
  };
}

export const RIGHT_PERMISSION_ROWS: Readonly<
  Record<string, readonly LawConsequenceRow[]>
> = {
  "us-policy-positions:justice-public-safety.restore-voting-after-sentence": [
    permissionRow(
      "right-permission:restore-voting-after-sentence",
      "recorded-person-permission",
    ),
  ],
  "us-policy-positions:justice-public-safety.permit-to-carry-concealed": [
    permissionRow(
      "right-permission:permit-to-carry-concealed",
      "recorded-person-permission",
      "application",
    ),
  ],
  "us-policy-positions:business-commerce.legalize-cannabis-sales": [
    permissionRow(
      "right-permission:legalize-cannabis-sales",
      "recorded-town-retail-permission",
    ),
    permissionRow(
      "right-permission:legalize-cannabis-sales:retail-opening",
      "recorded-town-retail-permission",
      "application",
    ),
  ],
};

function institutionRuleRow(
  id: string,
  field: string,
  unit: "minor/hour" | "count" | "years",
): LawConsequenceRow {
  return {
    id,
    kind: "institution-rule",
    when: "effective",
    who: {
      selector: "recorded-rule-institution",
      predicates: [
        { capability: "institution-rule-field", parameters: { field } },
      ],
    },
    what: "apply-adopted-institution-rule",
    amount: { op: "term", key: field, unit },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed",
    evidence,
  };
}

export const INSTITUTION_RULE_ROWS: Readonly<
  Record<string, readonly LawConsequenceRow[]>
> = {
  "us-policy-positions:labor-workforce.raise-minimum-wage": [
    institutionRuleRow(
      "institution-rule:state-minimum-wage",
      "labor.minimumWage.hourlyCents",
      "minor/hour",
    ),
  ],
  "us-policy-positions:government-operations.legislative-term-limits": [
    institutionRuleRow(
      "institution-rule:legislative-seat-count",
      "body.seats",
      "count",
    ),
    institutionRuleRow(
      "institution-rule:legislative-term-years",
      "term.years",
      "years",
    ),
  ],
};
