import type { LawConsequenceRow } from "../law-consequence-types";

export const GOVERNMENT_OPERATIONS_QUESTION_KEYS = {
  photoId: "us-policy-positions:government-operations.require-photo-id-to-vote",
  lobbying:
    "us-policy-positions:government-operations.ban-lobbying-after-office",
  sameDayRegistration:
    "us-policy-positions:government-operations.same-day-voter-registration",
} as const;

const VOTING_AGE_SCOPE = {
  capability: "government-operations-subject",
  parameters: { group: "voting-age-resident" },
};
const FORMER_OFFICIAL_SCOPE = {
  capability: "government-operations-subject",
  parameters: { group: "former-public-official" },
};

function row(input: {
  id: string;
  questionKey: string;
  selector: string;
  scope: typeof VOTING_AGE_SCOPE | typeof FORMER_OFFICIAL_SCOPE;
  action: string;
  sourceIds: string[];
  population: string;
  why: string;
  uncertainty: string;
}): LawConsequenceRow {
  return {
    id: input.id,
    kind: "government-operations",
    when: "effective",
    who: { selector: input.selector, predicates: [input.scope] },
    what: input.action,
    decision: { op: "term", key: "law-answer", type: "boolean" },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "recompute-prospective",
    evidence: {
      sourceIds: input.sourceIds,
      population: input.population,
      scope:
        "The actual governing election or ethics law for the person's recorded jurisdiction.",
      why: input.why,
      uncertainty: input.uncertainty,
    },
  };
}

/**
 * Each row records the policy rule that applies to a named person. The boolean
 * law answer is the complete modeled value; no turnout, registration status,
 * possession of identification, or cooling-off duration is inferred.
 */
export const GOVERNMENT_OPERATIONS_LAW_ROWS: Readonly<
  Record<string, LawConsequenceRow>
> = {
  [GOVERNMENT_OPERATIONS_QUESTION_KEYS.photoId]: row({
    id: "government-operations:photo-id-to-vote",
    questionKey: GOVERNMENT_OPERATIONS_QUESTION_KEYS.photoId,
    selector: "government-operations-voting-age-resident",
    scope: VOTING_AGE_SCOPE,
    action: "apply-photo-id-voting-requirement",
    sourceIds: [
      "data/research/laws/starting-law-2026.json#us-policy-positions:government-operations.require-photo-id-to-vote",
      "data/research/outcome-web/links.json#voter-id-to-turnout",
      "data/research/outcome-web/links.json#voter-id-to-registration",
    ],
    population:
      "Recorded residents aged 18 or older; used as a voting-age population proxy.",
    why: "The law's yes/no answer determines whether a photo-identification requirement governs voting for this resident's jurisdiction.",
    uncertainty:
      "The starting-law source records whether a photo-ID requirement exists, but not individual citizenship, voter registration, ID possession, the accepted alternatives, or an individual turnout effect. This record reports only the rule's application; it does not assert that the person lacks ID or is prevented from voting.",
  }),
  [GOVERNMENT_OPERATIONS_QUESTION_KEYS.lobbying]: row({
    id: "government-operations:ban-lobbying-after-office",
    questionKey: GOVERNMENT_OPERATIONS_QUESTION_KEYS.lobbying,
    selector: "government-operations-former-public-official",
    scope: FORMER_OFFICIAL_SCOPE,
    action: "apply-former-office-lobbying-bar",
    sourceIds: [
      "data/research/laws/starting-law-2026.json#us-policy-positions:government-operations.ban-lobbying-after-office",
    ],
    population:
      "People with a recorded ended legislative or executive office relationship in the governing jurisdiction.",
    why: "The law's yes/no answer determines whether the former official is subject to a post-office lobbying restriction.",
    uncertainty:
      "The source provides jurisdiction-specific legal notes, but the starting-law data stores only whether a restriction exists, not its exact duration, covered bodies, exceptions, or person-specific lobbying activity. The saved record marks the restriction's existence only.",
  }),
  [GOVERNMENT_OPERATIONS_QUESTION_KEYS.sameDayRegistration]: row({
    id: "government-operations:same-day-voter-registration",
    questionKey: GOVERNMENT_OPERATIONS_QUESTION_KEYS.sameDayRegistration,
    selector: "government-operations-voting-age-resident",
    scope: VOTING_AGE_SCOPE,
    action: "apply-same-day-registration-rule",
    sourceIds: [
      "data/research/laws/starting-law-2026.json#us-policy-positions:government-operations.same-day-voter-registration",
      "data/research/outcome-web/links.json#same-day-registration-to-youth-turnout",
    ],
    population:
      "Recorded residents aged 18 or older; used as a voting-age population proxy.",
    why: "The law's yes/no answer determines whether eligible residents may register and vote on the same day after the ordinary deadline.",
    uncertainty:
      "The starting-law source records whether same-day registration is available, but not individual citizenship, voter registration, participation, election-specific exceptions, or an individual turnout effect. This record reports only the rule's application and does not assert that the person registers or votes.",
  }),
};
