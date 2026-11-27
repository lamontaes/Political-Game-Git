#!/usr/bin/env python3
"""Economy item 5, family 1: the budgets engine's side registries for the
legislature's budget vote and the law reach's standing line laws become fields
the carrying modules hold (CoreModule.standingLineLaws, budgetVote,
budgetHearing, budgetVoteWaits; Core item 10, #10768), read through
module-fields.ts. No list is filled as a file loads. Re-runnable: each edit
prints applied, already or MISSED, and a miss exits 1 without writing."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
missed = []

def edit(path, pairs):
    p = ROOT / path
    s = p.read_text()
    out = s
    bad = False
    for n, (old, new) in enumerate(pairs, 1):
        if old in out:
            out = out.replace(old, new, 1)
            print(f"applied  {path} edit {n}")
        elif new == "" or new in out:
            print(f"already  {path} edit {n}")
        else:
            print(f"MISSED   {path} edit {n}")
            missed.append((path, n))
            bad = True
    if not bad:
        p.write_text(out)

edit("src/core2/modules/budgets.ts", [
    ('''/**
 * Laws that set a budget line's level (a dedicated levy, a share of one line
 * moved to another) are read by the treasury each month it closes and each
 * year a budget is adopted, so the line it pays is the line the law in force
 * sets. Law reach registers what runs them.
 */
let standingLineLaws: ((api: CoreAPI) => void) | null = null;
export function registerStandingLineLaws(run: (api: CoreAPI) => void): void {
  standingLineLaws = run;
}
''', '''/**
 * Laws that set a budget line's level (a dedicated levy, a share of one line
 * moved to another) are read by the treasury each month it closes and each
 * year a budget is adopted, so the line it pays is the line the law in force
 * sets. The law reach's module carries what runs them (`standingLineLaws`).
 */
function runStandingLineLaws(api: CoreAPI): void {
  for (const run of fieldsOf(api.state, "standingLineLaws")) run(api);
}
'''),
    ("  standingLineLaws?.(api);\n  // stopgapId: SG-GOV-outside-revenue-monthly", "  runStandingLineLaws(api);\n  // stopgapId: SG-GOV-outside-revenue-monthly"),
    ("  // The year's budget carries what the laws that set a line's level say.\n  standingLineLaws?.(api);", "  // The year's budget carries what the laws that set a line's level say.\n  runStandingLineLaws(api);"),
    ('''let councilBudgetVote:
  ((api: CoreAPI, gov: GovernmentRow, fy: number) => BudgetRow | null) | null =
  null;
/** The legislature engine registers how a council votes its budget. */
export function registerBudgetVote(
  vote: (api: CoreAPI, gov: GovernmentRow, fy: number) => BudgetRow | null,
): void {
  councilBudgetVote = vote;
}

let councilBudgetHearing:
  ((api: CoreAPI, gov: GovernmentRow, fy: number) => void) | null = null;
/** The legislature engine registers how a council holds its public hearing on the budget it will vote. */
export function registerBudgetHearing(
  hearing: (api: CoreAPI, gov: GovernmentRow, fy: number) => void,
): void {
  councilBudgetHearing = hearing;
}
''', '''/** How a council votes its budget: the legislature's module carries it (`budgetVote`), the first carrier answers. */
function councilBudgetVote(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
): BudgetRow | null {
  const voted = carriersOf(api.state, "budgetVote")[0]?.budgetVote?.(
    api,
    gov,
    fy,
  );
  return (voted as BudgetRow | null | undefined) ?? null;
}
'''),
    ('''  councilBudgetHearing?.(
    api,
    gov,
    fiscalYearOf(api.state.date, gov.fiscalYearStart) + 1,
  );''', '''  // The legislature's module carries how a council holds its public hearing on the budget it will vote (`budgetHearing`).
  carriersOf(api.state, "budgetHearing")[0]?.budgetHearing?.(
    api,
    gov,
    fiscalYearOf(api.state.date, gov.fiscalYearStart) + 1,
  );'''),
    ('''let budgetVoteWaits:
  ((api: CoreAPI, gov: GovernmentRow, fy: number) => boolean) | null = null;
/** The legislature engine says when a body's meeting votes the year's budget instead of the calendar. */
export function registerBudgetVoteWaits(
  waits: (api: CoreAPI, gov: GovernmentRow, fy: number) => boolean,
): void {
  budgetVoteWaits = waits;
}
''', ''),
    ("  if (budgetVoteWaits?.(api, gov, fy)) return;", "  // The legislature's module says when a body's meeting votes the year's budget instead of the calendar (`budgetVoteWaits`).\n  if (\n    carriersOf(api.state, \"budgetVoteWaits\")[0]?.budgetVoteWaits?.(api, gov, fy)\n  )\n    return;"),
    ("  const voted = councilBudgetVote?.(api, gov, fy) ?? null;", "  const voted = councilBudgetVote(api, gov, fy);"),
])
p = ROOT / "src/core2/modules/budgets.ts"
s = p.read_text()
imp = 'import { carriersOf, fieldsOf } from "../module-fields";'
if imp not in s and not missed:
    ms = list(re.finditer(r'^import [^;]*?;\n', s, re.M | re.S))
    s = s[:ms[-1].end()] + imp + "\n" + s[ms[-1].end():]
    p.write_text(s)
    print("applied  src/core2/modules/budgets.ts import")

edit("src/core2/modules/legislature.ts", [
    ("  registerBudgetVote,\n  registerBudgetHearing,\n  registerBudgetVoteWaits,\n", ""),
    ("  registerBudgetVote(councilBudget);\n  registerBudgetHearing(holdCouncilBudgetHearing);\n  registerBudgetVoteWaits(budgetVoteWaits);\n", ""),
    ("export const LEGISLATURE_MODULE: CoreModule = {\n  id: LEGISLATURE_MODULE_ID,\n  history: BILLS_HISTORY,\n",
     """export const LEGISLATURE_MODULE: CoreModule = {
  id: LEGISLATURE_MODULE_ID,
  history: BILLS_HISTORY,
  // What the budgets engine asks of a body: how a council votes its budget, holds its hearing on it, and whether its meeting votes the year's budget instead of the calendar.
  budgetVote: (api, gov, fiscalYear) =>
    councilBudget(api, gov as GovernmentRow, fiscalYear),
  budgetHearing: (api, gov, fiscalYear) =>
    holdCouncilBudgetHearing(api, gov as GovernmentRow, fiscalYear),
  budgetVoteWaits: (api, gov, fiscalYear) =>
    budgetVoteWaits(api, gov as GovernmentRow, fiscalYear),
"""),
])
edit("src/core2/law-reach/index.ts", [
    ('import { registerStandingLineLaws } from "../modules/budgets";\n', ""),
    ("  registerStandingLineLaws(reassertStandingLineLaws);\n", ""),
])
edit("src/core2/law-reach/host.ts", [
    ('import { registerLawReach } from "./index";', 'import { reassertStandingLineLaws, registerLawReach } from "./index";'),
    ("  onEvent: (api, event) => runHandlers(api, event),\n};", "  onEvent: (api, event) => runHandlers(api, event),\n  // The laws that set a budget line's level, which the treasury reads at each close.\n  standingLineLaws: reassertStandingLineLaws,\n};"),
])
if missed:
    print(f"{len(missed)} edit(s) missed; nothing written in those files.")
    sys.exit(1)
