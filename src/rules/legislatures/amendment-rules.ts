import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type {
  PolicyCatalog,
  EntityId,
  ChamberRuleChangeRecord,
  ChamberProcedureRuleKey,
  LegislativeMeasureRecord,
  PropositionAnswerRef,
} from "../../simulation/types";
import type {
  GermanenessSetting,
  AmendmentAccess,
  ProcedureRoute,
  ProcedureRuleState,
  SingleSubjectRule,
  Admissibility,
} from "../../simulation/governing/chamber-procedure";
export interface AmendmentRuleFacts {
  readonly germanenessRows: readonly GermanenessRow[];
  readonly singleSubjectRows: readonly SingleSubjectRow[];
  readonly changes: readonly ChamberRuleChangeRecord[];
  readonly policyCatalog: PolicyCatalog;
  readonly answers: readonly PropositionAnswerRef[];
}
interface GermanenessRow {
  readonly code: string;
  readonly chamber: string;
  readonly chamberName: string;
  readonly germaneRequired: string;
  readonly sourceType: string;
  readonly citation: string;
  readonly evidence: string;
}

interface SingleSubjectRow {
  readonly code: string;
  readonly singleSubject: string;
  readonly scope: string | null;
  readonly appropriationsException: string | null;
  readonly citation: string;
}

function placeCode(pack: LegislativeRulePack): string {
  return pack.jurisdictionKey.replace(/^US-/, "");
}

function germanenessRow(
  facts: AmendmentRuleFacts,
  pack: LegislativeRulePack,
  chamberKey: string,
): GermanenessRow | null {
  const rows = facts.germanenessRows.filter(
    (row) => row.code === placeCode(pack),
  );
  if (rows.length === 0) return null;
  if (pack.structure !== "bicameral" || rows.length === 1)
    return rows.length === 1 ? rows[0]! : null;
  const upper = pack.chamberOrder[1] === chamberKey;
  return rows.find((row) => (row.chamber === "Senate") === upper) ?? null;
}

function routeOf(sourceType: string): ProcedureRoute {
  if (sourceType === "constitution") return "constitution";
  if (sourceType === "joint-rule") return "joint-rule";
  if (sourceType === "chamber-rule") return "chamber-rule";
  if (sourceType.endsWith("manual-adopted")) return "adopted-manual";
  return "estimated";
}

function latestChange(
  facts: AmendmentRuleFacts,
  rulePackId: string,
  chamberKey: string,
  rule: ChamberProcedureRuleKey,
): ChamberRuleChangeRecord | null {
  let found: ChamberRuleChangeRecord | null = null;
  for (const record of facts.changes ?? []) {
    if (
      record.rulePackId === rulePackId &&
      record.chamberKey === chamberKey &&
      record.rule === rule &&
      (!found || record.sequence > found.sequence)
    )
      found = record;
  }
  return found;
}

export function startingGermaneness(
  facts: AmendmentRuleFacts,
  pack: LegislativeRulePack,
  chamberKey: string,
): ProcedureRuleState<GermanenessSetting> {
  const row = germanenessRow(facts, pack, chamberKey);
  if (!row) {
    return {
      value: "required",
      basis: "estimated-from-average",
      route: "estimated",
      citation:
        "Most common rule among read chambers: 83 of 83 require germane amendments (Research 6, germaneness.json).",
      change: null,
    };
  }
  const value: GermanenessSetting =
    row.germaneRequired === "yes" ? "required" : "appropriations-only";
  return {
    value,
    basis:
      row.evidence === "estimated-from-average"
        ? "estimated-from-average"
        : "read",
    route: routeOf(row.sourceType),
    citation: row.citation,
    change: null,
  };
}

export function germanenessRule(
  facts: AmendmentRuleFacts,
  pack: LegislativeRulePack,
  chamberKey: string,
): ProcedureRuleState<GermanenessSetting> {
  const start = startingGermaneness(facts, pack, chamberKey);
  const change = latestChange(facts, pack.packId, chamberKey, "germaneness");
  return change
    ? { ...start, value: change.value as GermanenessSetting, change }
    : start;
}

export function amendmentAccessRule(
  facts: AmendmentRuleFacts,
  pack: LegislativeRulePack,
  chamberKey: string,
): ProcedureRuleState<AmendmentAccess> {
  const usHouse =
    placeCode(pack) === "US" && pack.chamberOrder[0] === chamberKey;
  const start: ProcedureRuleState<AmendmentAccess> = usHouse
    ? {
        value: "structured",
        basis: "read",
        route: "chamber-rule",
        citation: "Rules of the House, Rule XIII cl. 6 (special rules)",
        change: null,
      }
    : {
        value: "open",
        basis: "game-default",
        route: "chamber-rule",
        citation:
          "The chamber's floor takes amendments under its rule pack; no rule read limits who may offer one.",
        change: null,
      };
  const change = latestChange(
    facts,
    pack.packId,
    chamberKey,
    "amendment-access",
  );
  return change
    ? { ...start, value: change.value as AmendmentAccess, change }
    : start;
}

export function singleSubjectRule(
  facts: AmendmentRuleFacts,
  pack: LegislativeRulePack,
): SingleSubjectRule | null {
  const row = facts.singleSubjectRows.find(
    (candidate) => candidate.code === placeCode(pack),
  );
  if (!row || row.singleSubject !== "yes") return null;
  const scope = (row.scope ?? "").toLowerCase();
  const exception = (row.appropriationsException ?? "").toLowerCase();
  const localOnly = scope.includes("private or local");
  const moneyOnly = scope.includes("appropriation bills only");
  const generalBills = !localOnly && !moneyOnly;
  const appropriationBills =
    moneyOnly ||
    /nothing but|embrace only|only ordinary|shall contain only|confined to/.test(
      exception,
    ) ||
    (generalBills &&
      (exception === "" ||
        exception === "n/a" ||
        exception.startsWith("none stated")));
  return { generalBills, appropriationBills, citation: row.citation };
}

export function billDomains(
  facts: AmendmentRuleFacts,
  measure: LegislativeMeasureRecord,
): ReadonlySet<string> {
  const domains = new Set<string>();
  const ids = new Set<EntityId>([
    ...(measure.propositionIds ?? []),
    ...facts.answers.map((row) => row.propositionId),
  ]);
  for (const id of ids) {
    const domain = domainOf(facts, id);
    if (domain) domains.add(domain);
  }
  return domains;
}

function domainOf(
  facts: AmendmentRuleFacts,
  propositionId: EntityId,
): string | null {
  const proposition = facts.policyCatalog.propositions[propositionId];
  if (!proposition) return null;
  return facts.policyCatalog.issues[proposition.issueId]?.domainId ?? null;
}

export function amendmentAdmissible(
  facts: AmendmentRuleFacts,
  pack: LegislativeRulePack,
  chamberKey: string,
  measure: LegislativeMeasureRecord,
  part: PropositionAnswerRef,
): Admissibility {
  const access = amendmentAccessRule(facts, pack, chamberKey);
  if (access.value === "closed")
    return {
      admissible: false,
      reason: "The chamber has closed the floor to amendments.",
    };
  if (access.value === "structured")
    return {
      admissible: false,
      reason:
        "Only amendments a special rule makes in order may be offered, and none was made in order.",
    };
  const domain = domainOf(facts, part.propositionId);
  const domains = billDomains(facts, measure);
  const inSubject = domain !== null && domains.has(domain);
  const money = measure.subjectClass === "appropriation";
  const subject = singleSubjectRule(facts, pack);
  if (subject) {
    if (money && subject.appropriationBills)
      return {
        admissible: false,
        reason: `The constitution confines an appropriation bill to appropriations (${subject.citation}).`,
      };
    if (!money && subject.generalBills && !inSubject && domains.size > 0)
      return {
        admissible: false,
        reason: `The constitution confines a law to one subject (${subject.citation}).`,
      };
  }
  const germane = germanenessRule(facts, pack, chamberKey);
  if (germane.value === "appropriations-only" && money)
    return {
      admissible: false,
      reason: `An appropriation bill may not carry general legislation (${germane.change ? "the chamber's rule as changed" : germane.citation}).`,
    };
  if (germane.value === "required" && !inSubject && !money)
    return {
      admissible: false,
      reason: `The amendment is not germane to the bill (${germane.change ? "the chamber's rule as changed" : germane.citation}).`,
    };
  return { admissible: true, reason: "In order." };
}

// stopgapId: "SG-P14-legislatures-amendment-future-change"
