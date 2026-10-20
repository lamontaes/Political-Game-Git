/** Policy authority from the shared research catalog and current state laws. */
import catalog from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
import mapping from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import territoryGrant from "../../data/research/powers-catalog/territory-grant.json" with { type: "json" };
import geography from "../../data/research/geography/state-reference.json" with { type: "json" };
import { POLICY_QUESTIONS } from "./policy-answers";
import { LAWS_MODULE_ID, lawChain } from "./modules/laws";
import type { Authority } from "./modules/legislature";
import type { CoreAPI } from "./types";
import { lawApplied } from "./law-reach/applied";
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import type { LawRowInput } from "./laws-starting";

export type PolicyLevel = "federal" | "state" | "county" | "city";
type Column = PolicyLevel | "dc" | "territory";
interface Cell {
  may: string;
  status?: string;
  source?: string;
}
interface Mapping {
  dial: string;
  levels: readonly string[];
  gate?: { question: string; noBars: string };
}
const QUESTIONS = mapping.questions as Readonly<Record<string, Mapping>>;
const DIALS = new Map(
  (
    catalog.dials as unknown as readonly {
      id: string;
      levels: Record<string, Cell>;
    }[]
  ).map((row) => [row.id, row.levels]),
);
const KINDS = geography.places as Readonly<
  Record<string, { jurisdictionKind: string }>
>;
const HOME_RULE =
  "us-policy-positions:government-operations.broaden-local-authority";

/** Current recorded law, not the opening answer once the state has changed it. */
function stateLaw(api: CoreAPI, question: string): LawRowInput | undefined {
  return (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeries", [
        lawChain(api).stateKey,
        question,
      ]) as unknown as LawRowInput[]
  )
    .filter(
      (row) =>
        row.effectiveDate <= api.state.date &&
        (!row.endDate || row.endDate > api.state.date),
    )
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    .at(-1);
}

/** A recorded unknown blocks introduction; it is never silently treated as a grant. */
export function policyAuthority(
  api: CoreAPI,
  question: string,
  level: PolicyLevel,
): Authority {
  const state = lawChain(api).stateKey;
  const kind = KINDS[state.slice(state.lastIndexOf("-") + 1)]?.jurisdictionKind;
  const column: Column =
    kind === "federal-district" && level !== "federal"
      ? "dc"
      : level === "state" && kind === "territory"
        ? "territory"
        : level;
  const own =
    column === "dc"
      ? ["state", "county", "city"]
      : column === "territory"
        ? ["state"]
        : [column];
  const row = QUESTIONS[question];
  const source = `data/research/powers-catalog/question-powers.json#${question}`;
  const result = (
    allowed: boolean,
    reason: Authority["reason"],
    basis = source,
    disputed = false,
  ): Authority => ({
    allowed,
    reason,
    source: basis,
    warning: disputed ? "disputed" : allowed ? "none" : "preempted",
  });
  const unsettled = (basis = source): Authority => {
    api.stopgap("SG-GOV-policy-power-unresolved");
    return result(false, "no-state-law", basis, true);
  };
  if (!row) return unsettled();
  if (!row.levels.some((reach) => own.includes(reach)))
    return result(false, "level-lacks-power");
  const listed = DIALS.get(row.dial)?.[column];
  // A territory's cell the catalog has not read is its state cell: the organic
  // acts give a territorial legislature the rightful subjects of legislation
  // not inconsistent with federal law (an estimate, marked as one).
  const inherited =
    column === "territory" && listed?.may === "UNKNOWN"
      ? DIALS.get(row.dial)?.[territoryGrant.inherits]
      : undefined;
  const cell: Cell | undefined = inherited
    ? { may: inherited.may, status: territoryGrant.tag.toLowerCase() }
    : listed;
  const basis = inherited
    ? `data/research/powers-catalog/territory-grant.json (estimated from the state cell of ${row.dial})`
    : `data/research/powers-catalog/catalog.json#${row.dial}/${column}`;
  if (cell?.status === "game-profile" || inherited)
    api.stopgap("SG-GOV-policy-power-conditions");
  if (cell?.may === "no") return result(false, "level-lacks-power", basis);
  const local = column === "county" || column === "city";
  if (local) {
    const answer = POLICY_QUESTIONS[question]?.answers[state];
    if (answer?.preempts)
      return result(
        false,
        "state-preempts-question",
        stateLaw(api, question)?.id ?? source,
      );
    if (row.gate) {
      const law = stateLaw(api, row.gate.question);
      if (!law) return unsettled();
      if (
        law.value === 0 &&
        (row.gate.noBars === "always" ||
          POLICY_QUESTIONS[row.gate.question]?.answers[state]?.preempts)
      )
        return result(false, "state-preempts-question", law.id);
      if (law.value === 1) return result(true, "state-has-own-law", law.id);
    }
    if (
      cell?.may === "UNKNOWN" ||
      (cell?.may === "varies by state" && cell.status === "game-profile")
    ) {
      const grant = stateLaw(api, HOME_RULE);
      if (!grant) return unsettled(basis);
      // The state's grant of home rule is what lets this level's body
      // legislate here: the government it let is the law's reach.
      if (grant.value === 1) {
        const body = api.state.modules.has(BUDGETS_MODULE_ID)
          ? governments(api).find((g) => g.level === level)
          : undefined;
        lawApplied(api, {
          key: HOME_RULE,
          lawId: grant.id,
          targetId: body?.id ?? `${level}:${lawChain(api).townPlaceId}`,
          target: "government",
          engine: "core2-legislature-v1",
          what: "home-rule-lets-body-legislate",
        });
      }
      return result(
        grant.value === 1,
        grant.value === 1 ? "state-has-own-law" : "level-lacks-power",
        grant.id,
      );
    }
  }
  if (cell?.may === "limited") api.stopgap("SG-GOV-policy-power-conditions");
  if (cell?.may === "yes" || cell?.may === "limited")
    return result(true, "within-own-power", basis, cell.may === "limited");
  return unsettled(basis);
}
