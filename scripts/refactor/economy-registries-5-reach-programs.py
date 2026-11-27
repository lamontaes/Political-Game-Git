#!/usr/bin/env python3
"""Economy item 5, family 5: the treasury's monthly programs, fiscal rules and
in-town line payments that the law reach and the state office day registered
become fields their modules carry (CoreModule.monthlyProgram, treasuryRule,
linePayments; Core item 10, #10768), read through module-fields.ts. The law
reach's host carries the three the reach pays (the redistricting commission,
then the benefit programs; the fiscal rules; the benefit lines) and the state
office day's module carries its per diem. Re-runnable: each edit prints
applied, already or MISSED; a miss exits 1 without writing that file."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
missed = []

def edit(path, pairs, imports=()):
    p = ROOT / path
    out = p.read_text()
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
    if bad:
        return
    for line in imports:
        if line not in out:
            ms = list(re.finditer(r"^import [^;]*?;\n", out, re.M | re.S))
            at = ms[-1].end() if ms else 0
            out = out[:at] + line + "\n" + out[at:]
            print(f"applied  {path} import {line[:50]}")
    p.write_text(out)

edit("src/core2/modules/budgets.ts", [
    ("  for (const pay of monthlyPrograms) pay(api, work.source);", "  for (const pay of fieldsOf(api.state, \"monthlyProgram\"))\n    pay(api, work.source);"),
    ("""const monthlyPrograms: ((api: CoreAPI, source: Source) => void)[] = [];
/** An engine registers a program its law has a treasury pay at each month's close. */
export function registerMonthlyProgram(
  pay: (api: CoreAPI, source: Source) => void,
): void {
  if (!monthlyPrograms.includes(pay)) monthlyPrograms.push(pay);
}
""", ""),
    ("registered by the engines that apply them.", "carried (`monthlyProgram`) by the modules of the engines that apply them."),
])
edit("src/core2/budgets-treasury.ts", [
    ("  linePayers,\n  registerLinePayments,\n  registerTreasuryRule,\n  treasuryRules,\n", ""),
    ("export { registerLinePayments, registerTreasuryRule, type LineAddition };", "export type { LineAddition };"),
    ("  for (const rule of treasuryRules) rule(api);", "  for (const rule of fieldsOf(api.state, \"treasuryRule\")) rule(api);"),
    ("    for (const payer of linePayers)\n      for (const [line, minor] of Object.entries(payer(api, gov)))", "    for (const carrier of carriersOf(api.state, \"linePayments\"))\n      for (const [line, minor] of Object.entries(\n        carrier.linePayments!(api, gov),\n      ))"),
])
edit("src/core2/budgets-line-payers.ts", [
    ("""/** Lines in-town engines pay this month without a payday (law-reach benefits). */
export type LinePayer = (
  api: CoreAPI,
  gov: GovernmentRow,
) => Record<string, number>;

export const linePayers: LinePayer[] = [];

export function registerLinePayments(payer: LinePayer): void {
  if (!linePayers.includes(payer)) linePayers.push(payer);
}

""", ""),
    ("""/**
 * The fiscal rules a treasury reads as it budgets (a balanced budget, pension
 * funding, a minimum reserve): each month's close reads the rules in force and
 * applies them to the budget it then pays from, before any line is paid.
 */
type TreasuryRule = (api: CoreAPI) => void;
export const treasuryRules: TreasuryRule[] = [];
export function registerTreasuryRule(rule: TreasuryRule): void {
  if (!treasuryRules.includes(rule)) treasuryRules.push(rule);
}
""", ""),
])
edit("src/core2/law-reach/group-b.ts", [
    ('import { registerTreasuryRule } from "../budgets-treasury";\n', ""),
    ("  carriedMeasureOf,\n  governments,\n  registerMonthlyProgram,\n} from \"../modules/budgets\";", "  carriedMeasureOf,\n  governments,\n} from \"../modules/budgets\";"),
    ("  registerMonthlyProgram(runBenefitPrograms);\n  registerTreasuryRule(reviewFiscalRules);\n", ""),
    ("function runBenefitPrograms(api: CoreAPI): void {", "export function runBenefitPrograms(api: CoreAPI): void {"),
    ("function reviewFiscalRules(api: CoreAPI): void {", "export function reviewFiscalRules(api: CoreAPI): void {"),
    ("(`registerMonthlyProgram`)", "(the host's `monthlyProgram`)"),
])
edit("src/core2/law-reach/group-a-voting.ts", [
    ("  registerMonthlyProgram,\n", ""),
    ("function payRedistrictingCommission(api: CoreAPI, source: Source): void {", "export function payRedistrictingCommission(\n  api: CoreAPI,\n  source: Source,\n): void {"),
    ("""/**
 * Registers the commission's monthly payment with the budgets engine. Called
 * from `registerGroupA` (the law reach's init), never at module load: the
 * budgets module's registry may not be built yet when this file is imported.
 */
export function registerVotingMonthlyProgram(): void {
  registerMonthlyProgram(payRedistrictingCommission);
}
""", ""),
])
edit("src/core2/office-day-state.ts", [
    ('import {\n  BUDGETS_MODULE_ID,\n  governments,\n  setBudgetPriorities,\n} from "./modules/budgets";', 'import {\n  BUDGETS_MODULE_ID,\n  governments,\n  setBudgetPriorities,\n  type GovernmentRow,\n} from "./modules/budgets";'),
])
edit("src/core2/law-reach/group-a.ts", [
    ("  registerVotingMonthlyProgram();\n", ""),
])
edit("src/core2/law-reach/group-b-money.ts", [
    ("  registerLinePayments,\n", ""),
    ("registerLinePayments((api, gov) => {\n  const accounts = api.accounts();", "/** The lines the law reach's benefits pay this month without a payday (the host's `linePayments`). */\nexport function benefitLinePayments(\n  api: CoreAPI,\n  gov: GovernmentRow,\n): Record<string, number> {\n  const accounts = api.accounts();"),
    ("    out[line] = (out[line] ?? 0) + row.amountMinor;\n  }\n  return out;\n});", "    out[line] = (out[line] ?? 0) + row.amountMinor;\n  }\n  return out;\n}"),
])
edit("src/core2/law-reach/index.ts", [
    ('import { registerGroupA } from "./group-a";', 'import { registerGroupA } from "./group-a";\nimport { payRedistrictingCommission } from "./group-a-voting";'),
    ("import { GROUP_B_KEYS, groupBPolicy, registerGroupB } from \"./group-b\";", "import {\n  GROUP_B_KEYS,\n  groupBPolicy,\n  registerGroupB,\n  reviewFiscalRules,\n  runBenefitPrograms,\n} from \"./group-b\";"),
    ("let registered = false;\nexport function registerLawReach", "/** The treasury's monthly programs the law reach pays: the redistricting commission, then each benefit program. */\nexport function reachMonthlyPrograms(api: CoreAPI, source: Source): void {\n  payRedistrictingCommission(api, source);\n  runBenefitPrograms(api);\n}\nexport { reviewFiscalRules };\n\nlet registered = false;\nexport function registerLawReach"),
    ('import type { CoreAPI } from "../types";', 'import type { CoreAPI, Source } from "../types";'),
])
edit("src/core2/law-reach/host.ts", [
    ('import { reassertStandingLineLaws, registerLawReach } from "./index";', 'import {\n  reachMonthlyPrograms,\n  reassertStandingLineLaws,\n  registerLawReach,\n  reviewFiscalRules,\n} from "./index";\nimport { benefitLinePayments } from "./group-b-money";'),
    ("  standingLineLaws: reassertStandingLineLaws,\n", "  standingLineLaws: reassertStandingLineLaws,\n  // What the law reach has a treasury pay each month, the fiscal rules it reads before it pays, and the lines its benefits pay in town.\n  monthlyProgram: reachMonthlyPrograms,\n  treasuryRule: reviewFiscalRules,\n  linePayments: benefitLinePayments,\n"),
])
edit("src/core2/office-day-state.ts", [
    ('import { lineForPost, registerLinePayments } from "./budgets-treasury";', 'import { lineForPost } from "./budgets-treasury";'),
    ("""// The treasury pays these obligations after revenue arrives and before residual spending.
registerLinePayments((api, gov) =>
  api.state.modules.has(OFFICE_DAY_STATE_MODULE_ID) &&
  gov.level === "state" &&
  gov.id === lawChain(api).stateKey
    ? payPerDiem(api)
    : {},
);
""", """// The treasury pays these obligations after revenue arrives and before residual spending.
function perDiemLinePayments(
  api: CoreAPI,
  gov: GovernmentRow,
): Record<string, number> {
  return api.state.modules.has(OFFICE_DAY_STATE_MODULE_ID) &&
    gov.level === "state" &&
    gov.id === lawChain(api).stateKey
    ? payPerDiem(api)
    : {};
}
"""),
    ("export const OFFICE_DAY_STATE_MODULE: CoreModule = {\n  id: OFFICE_DAY_STATE_MODULE_ID,\n", "export const OFFICE_DAY_STATE_MODULE: CoreModule = {\n  id: OFFICE_DAY_STATE_MODULE_ID,\n  // The per diem a state legislator is owed, which the treasury pays at its close (`linePayments`).\n  linePayments: perDiemLinePayments,\n"),
])
edit("src/core2/law-reach/group-a.ts", [
    ('import { registerVotingMonthlyProgram, votingLaw } from "./group-a-voting";', 'import { votingLaw } from "./group-a-voting";'),
])
edit("src/core2/budgets-line-payers.ts", [
    ('import type { CoreAPI } from "./types";\nimport type { GovernmentRow } from "./modules/budgets";\n', ""),
    ("// The registries engines fill at import time for the treasury: the in-town\n// engines that pay a budget line this month without a payday (the law-reach\n// benefits, the office day's lines), the laws that raise a line, and the fiscal\n// rules a treasury reads as it budgets. A leaf module with no imports of\n// engines: they register at import time, so the registry must exist before any\n// of them loads, whichever file is entered first.\n", "// What a law that raised a budget line records (the line additions the law\n// reach's host carries, read by the treasury). A leaf module with no imports.\n"),
])
if missed:
    print(f"{len(missed)} edit(s) missed; nothing written in those files.")
    sys.exit(1)
