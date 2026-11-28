#!/usr/bin/env python3
"""Economy item 5, family 2: the treasury's side registries for the laws that
raise a line, the grant pass-through and the contracts module's awarder become
fields the carrying modules hold (CoreModule.lineAdditions, budgetPassThrough,
contractAwarder; Core item 10, #10768), read through module-fields.ts. Re-run
on a clean copy of the files; each edit prints applied, already or MISSED, and
a miss exits 1 without writing that file."""
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

edit("src/core2/budgets-line-payers.ts", [
    ('''export const lineAdders: {
  keys: readonly string[];
  additions: (api: CoreAPI, gov: GovernmentRow) => readonly LineAddition[];
}[] = [];

/** Law reach says which laws raise a line by their own amount, so the treasury can record whom their share of the line pays. */
export function registerLineAdditions(
  adder: (typeof lineAdders)[number],
): void {
  if (!lineAdders.some((a) => a.additions === adder.additions))
    lineAdders.push(adder);
}

''', ""),
    ('''/**
 * What another government's bills add to a government's own spending line
 * (a federal grant line a bill raised, paid on to the states and towns that
 * receive it, raises the line each of them spends it on). Registered by the
 * treasury; read when a budget is built and again when a bill amends the
 * federal budget. Each returns dollars to add to a line, and a negative
 * number takes from it.
 */
export type BudgetPassThrough = (
  api: CoreAPI,
  gov: GovernmentRow,
  revenueMinor: Readonly<Record<string, number>>,
) => Readonly<Record<string, number>>;
export const budgetPassThroughs: BudgetPassThrough[] = [];
export function registerBudgetPassThrough(through: BudgetPassThrough): void {
  if (!budgetPassThroughs.includes(through)) budgetPassThroughs.push(through);
}

''', ""),
])

edit("src/core2/budgets-treasury.ts", [
    ("  lineAdders,\n  linePayers,\n  registerBudgetPassThrough,\n  registerLineAdditions,\n  registerLinePayments,", "  linePayers,\n  registerLinePayments,"),
    ('''registerBudgetPassThrough((api, gov, revenueMinor) => {
  const flow = DATA.aid.flows.find(''', '''export function grantPassThrough(
  api: CoreAPI,
  gov: GovernmentRow,
  revenueMinor: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const flow = DATA.aid.flows.find('''),
    ("    out[spentOn] =\n      (out[spentOn] ?? 0) + Math.round((aid * byBills) / baseTotal);\n  }\n  return out;\n});", "    out[spentOn] =\n      (out[spentOn] ?? 0) + Math.round((aid * byBills) / baseTotal);\n  }\n  return out;\n}"),
    ("  const out = lineAdders\n    .flatMap((a) => a.additions(api, gov))\n    .filter((a) => a.line === line);", "  const out = fieldsOf(api.state, \"lineAdditions\")\n    .flatMap((a) => a.additions(api, gov) as readonly LineAddition[])\n    .filter((a) => a.line === line);"),
    ("export {\n  registerLineAdditions,\n  registerLinePayments,", "export {\n  registerLinePayments,"),
    ("  const lineLawKeys = new Set(lineAdders.flatMap((a) => a.keys));", "  const lineLawKeys = new Set(\n    fieldsOf(api.state, \"lineAdditions\").flatMap((a) => a.keys),\n  );"),
    ('''let contractAwarder: ContractAwarder | null = null;
/** The contracts module registers how a government's body chooses among bids. */
export function registerContractAwarder(awarder: ContractAwarder): void {
  contractAwarder = awarder;
}
''', '''/** How a government's body chooses among bids: the contracts module carries it (`contractAwarder`). */
function contractAwarderOf(api: CoreAPI): ContractAwarder | undefined {
  return carriersOf(api.state, "contractAwarder")[0]?.contractAwarder as
    | ContractAwarder
    | undefined;
}
'''),
    ('''      const award =
        bought > 0 && firms.length && contractAwarder
          ? contractAwarder.award(api, {''', '''      const awarder = contractAwarderOf(api);
      const award =
        bought > 0 && firms.length && awarder
          ? awarder.award(api, {'''),
    ("          contractAwarder?.paid(api, winner.id, {\n            id,\n            amountMinor: out.base,", "          contractAwarderOf(api)?.paid(api, winner.id, {\n            id,\n            amountMinor: out.base,"),
    ("          contractAwarder?.paid(api, winner.id, {\n            id: part.id,", "          contractAwarderOf(api)?.paid(api, winner.id, {\n            id: part.id,"),
], imports=['import { carriersOf, fieldsOf } from "./module-fields";'])

edit("src/core2/modules/budgets.ts", [
    ('import { budgetPassThroughs } from "../budgets-line-payers";\n', ""),
    ("  for (const through of budgetPassThroughs)\n    for (const [line, delta] of Object.entries(through(api, gov, revenueMinor)))", "  for (const through of fieldsOf(api.state, \"budgetPassThrough\"))\n    for (const [line, delta] of Object.entries(\n      through(api, gov, revenueMinor),\n    ))"),
    ("const BUDGETS_MODULE: PreStartModule = {\n  id: BUDGETS_MODULE_ID,\n  preStart: { phase: \"government\", run: budgetHistory },\n", "const BUDGETS_MODULE: PreStartModule = {\n  id: BUDGETS_MODULE_ID,\n  preStart: { phase: \"government\", run: budgetHistory },\n  // What a bill that moved a federal grant line adds to the line a state, county or town spends that grant on.\n  budgetPassThrough: grantPassThrough,\n"),
    ("  landTaxChange,\n} from \"../budgets-treasury\";\nimport {", "  landTaxChange,\n  grantPassThrough,\n} from \"../budgets-treasury\";\nimport {"),
])

edit("src/core2/modules/contracts.ts", [
    ("  registerContractAwarder,\n", ""),
    ("""/** Register the module and tell the treasury how the body chooses its firms. */
export function openContracts(core: CoreState): void {
  if (!core.modules.has(CONTRACTS_MODULE_ID))
    registerModule(core, CONTRACTS_MODULE);
  registerContractAwarder({
    award,
    paid(api, awardId, payment) {
      if (!api.state.modules.has(CONTRACTS_MODULE_ID)) return;
      const row = table(api).get(awardId) as unknown as
        ContractAwardRow | undefined;
      if (!row || row.paymentIds.includes(payment.id)) return;
      table(api).put({
        ...row,
        paidMinor: row.paidMinor + payment.amountMinor,
        paymentIds: [...row.paymentIds, payment.id],
        lastPaidOn: api.state.date,
      } as unknown as ModuleRow);
    },
  });
}""", """/** Register the module; it carries how the body chooses its firms (`contractAwarder`). */
export function openContracts(core: CoreState): void {
  if (!core.modules.has(CONTRACTS_MODULE_ID))
    registerModule(core, CONTRACTS_MODULE);
}"""),
    ("export const CONTRACTS_MODULE: CoreModule = {\n  id: CONTRACTS_MODULE_ID,\n", """export const CONTRACTS_MODULE: CoreModule = {
  id: CONTRACTS_MODULE_ID,
  // How a government's body chooses among bids, and a record of each payment; the treasury asks it.
  contractAwarder: {
    award,
    paid(api, awardId, payment) {
      if (!api.state.modules.has(CONTRACTS_MODULE_ID)) return;
      const row = table(api).get(awardId) as unknown as
        ContractAwardRow | undefined;
      if (!row || row.paymentIds.includes(payment.id)) return;
      table(api).put({
        ...row,
        paidMinor: row.paidMinor + payment.amountMinor,
        paymentIds: [...row.paymentIds, payment.id],
        lastPaidOn: api.state.date,
      } as unknown as ModuleRow);
    },
  },
"""),
])

edit("src/core2/law-reach/group-a-money.ts", [
    ("""// added share of each payment reached (budgets-treasury.ts).
registerLineAdditions({
  keys: [PARKS_LINE.key, FACIAL_LINE.key],
  additions: (api, gov) =>""", """// added share of each payment reached (budgets-treasury.ts). The law reach's
// host carries it (`lineAdditions`).
export const reachALineAdditions = {
  keys: [PARKS_LINE.key, FACIAL_LINE.key],
  additions: (api: CoreAPI, gov: GovernmentRow) =>"""),
    ("""      ];
    }),
});

// --- housing spending""", """      ];
    }),
};

// --- housing spending"""),
    ('import { registerLineAdditions } from "../budgets-treasury";\n', ""),
])
edit("src/core2/law-reach/host.ts", [
    ('import { reassertStandingLineLaws, registerLawReach } from "./index";', 'import { reassertStandingLineLaws, registerLawReach } from "./index";\nimport { reachALineAdditions } from "./group-a-money";'),
    ("  standingLineLaws: reassertStandingLineLaws,\n", "  standingLineLaws: reassertStandingLineLaws,\n  // The laws that raised a line by their own amount, so the treasury can record whom their share of the line pays.\n  lineAdditions: reachALineAdditions,\n"),
])
if missed:
    print(f"{len(missed)} edit(s) missed; nothing written in those files.")
    sys.exit(1)
