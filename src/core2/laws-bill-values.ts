/** A drafting reader: the law or budget of the government making the bill. */
import type { CoreAPI } from "./types";
import type { LawRowInput } from "./laws-starting";
import { lawChain, lawInForce } from "./modules/laws";
import {
  BUDGETS_MODULE_ID,
  budgetInForce,
  governments,
} from "./modules/budgets";

export interface BillSubject {
  readonly kind: string;
  readonly series?: string;
  readonly question?: string;
  readonly line?: string;
}

export interface BillValue {
  readonly value: number | null;
  readonly unit: string | null;
  readonly recordId: string | null;
  readonly row: LawRowInput | null;
}

/** Default jurisdiction for a catalog whose caller supplies only a level. */
export function billLevelJurisdiction(
  api: CoreAPI,
  level: "federal" | "state" | "city",
): string {
  const chain = lawChain(api);
  return level === "federal"
    ? "US"
    : level === "state"
      ? chain.stateKey
      : chain.levels.at(-1)!.jurisdiction;
}

/** Both drafting views read this value and its source record. */
export function billValueInForce(
  api: CoreAPI,
  subject: BillSubject,
  jurisdiction: string,
): BillValue {
  if (subject.kind === "budget-line") {
    const all = api.state.modules.has(BUDGETS_MODULE_ID)
      ? governments(api)
      : [];
    const government =
      all.find((row) => row.id === jurisdiction) ??
      all.find(
        (row) =>
          api.state.organizations.get(row.organizationId)?.governmentFacts
            ?.governmentKey === jurisdiction,
      );
    const budget = government && budgetInForce(api, government.id);
    return {
      value:
        budget && subject.line
          ? (budget.spendingMinor[subject.line] ?? 0)
          : null,
      unit: "minor",
      recordId: budget?.id ?? null,
      row: null,
    };
  }
  const series =
    subject.kind === "policy-question" ? subject.question : subject.series;
  if (!series) return { value: null, unit: null, recordId: null, row: null };
  const answer = lawInForce(api, series);
  const at = answer.levels.findIndex(
    (row) => row.jurisdiction === jurisdiction,
  );
  if (at < 0) return { value: null, unit: null, recordId: null, row: null };
  const own = answer.levels[at]!;
  let row: LawRowInput | null = null;
  if (answer.doctrine === "additive") {
    row = own.row;
  } else {
    // Only this jurisdiction and its governing levels apply to this bill.
    // A neighboring county in the place's chain never supplies its baseline.
    const governing = answer.levels
      .slice(0, at + 1)
      .filter(
        (level) =>
          !level.setAside &&
          level.row &&
          (level.level === "federal" ||
            level.level === "state" ||
            level.jurisdiction === jurisdiction ||
            own.level === "city"),
      );
    if (answer.doctrine === "floor") {
      for (const level of governing)
        if (!row || (level.row!.value ?? 0) > (row.value ?? 0)) row = level.row;
    } else row = governing.at(-1)?.row ?? null;
  }
  return {
    value: row ? row.value : answer.doctrine === "additive" ? 0 : null,
    unit: row?.unit ?? null,
    recordId: row?.id ?? null,
    row,
  };
}
