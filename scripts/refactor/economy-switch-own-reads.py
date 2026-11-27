#!/usr/bin/env python3
"""Economy item 2: switch Economy's own files from opening the macro, business
and employer-tax tables to the families' read doors (src/core2/macro-reads.ts,
business-reads.ts, budgets-reads.ts). Re-runnable: each edit applies only where
its old text is still there. Structure only; the records digest stays identical."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]

def edit(path, pairs, imports):
    p = ROOT / path
    s = p.read_text()
    for old, new in pairs:
        if old in s:
            s = s.replace(old, new, 1)
    for line in imports:
        if line not in s:
            # after the last top-level import statement
            ms = list(re.finditer(r'^import [^;]*?;\n', s, re.M | re.S))
            at = ms[-1].end() if ms else 0
            s = s[:at] + line + "\n" + s[at:]
    p.write_text(s)

edit("src/core2/budgets-treasury.ts", [
    ('for (const row of api.moduleState("macro").table("countryStates").rows()) {\n    const moved = (\n      row as unknown as {\n        whatMoved: {\n          month: number;\n          withheld: { level: string; tax: string; dollars: number }[];\n        }[];\n      }\n    ).whatMoved;',
     'for (const row of allCountryStates(api)) {\n    const moved = row.whatMoved;'),
    ('  const macro = api.moduleState("macro");\n  const months = macro.table("months").rows() as unknown as {\n    month: string;\n    priceIndex: number;\n    treasury10Pct: number;\n  }[];\n  let last: (typeof months)[number] | undefined;',
     '  const months = allMacroMonths(api);\n  let last: (typeof months)[number] | undefined;'),
    ('  for (const row of macro.table("countryStates").rows())\n    for (const cell of (row as unknown as { cells: { people: number }[] })\n      .cells ?? [])\n      people += cell.people;',
     '  for (const row of allCountryStates(api))\n    for (const cell of row.cells ?? []) people += cell.people;'),
    ('  const months = api.moduleState("macro").table("months");\n  const row = (month: string) =>\n    months.get(`macro-month:${month}`) as unknown as\n      { payrollJobsThousands: number; hourlyEarnings: number } | undefined;',
     '  const row = (month: string) => macroMonthAt(api, month);'),
], ['import { allCountryStates, allMacroMonths, macroMonthAt } from "./macro-reads";'])

edit("src/core2/tax-index.ts", [
    ('  const months = api.moduleState("macro").table("months");\n', ''),
    ('      months.get(`macro-month:${y}-01`) as unknown as MonthRow | undefined;',
     '      macroMonthAt(api, `${y}-01`) as MonthRow | undefined;'),
], ['import { macroMonthAt } from "./macro-reads";'])

edit("src/core2/modules/outside-budgets.ts", [
    ('  return api\n    .moduleState(MACRO_MODULE_ID)\n    .table("countryStates")\n    .get(tierId(stateKey)) as unknown as CountryState | undefined;',
     '  return countryStateByKey(api, stateKey);'),
], ['import { countryStateByKey } from "../macro-reads";'])

edit("src/core2/business-books-view.ts", [
    ('  if (core.modules.has(EMPLOYER_TAXES_MODULE_ID)) {\n    const state = api.moduleState(EMPLOYER_TAXES_MODULE_ID);\n    for (const row of state\n      .table("shares")\n      .query("byEmployer", [organizationId]) as unknown as EmployerTaxRecord[])\n      taxesPaid += row.paidMinor;\n    for (const row of state\n      .table("profits")\n      .query("byBusiness", [organizationId]) as unknown as ProfitTaxRecord[]) {\n      taxesPaid += row.paidMinor;\n      recordIds.push(row.id);\n    }\n  }',
     '  for (const row of employerTaxRecordsOf(api, organizationId))\n    taxesPaid += row.paidMinor;\n  for (const row of profitTaxRecordsOf(api, organizationId)) {\n    taxesPaid += row.paidMinor;\n    recordIds.push(row.id);\n  }'),
    ('  if (core.modules.has(BUSINESS_MODULE_ID))\n    for (const row of api\n      .moduleState(BUSINESS_MODULE_ID)\n      .table("outsideCosts")\n      .query("byOrganization", [organizationId]) as unknown as { id: string }[])\n      recordIds.push(row.id);',
     '  recordIds.push(...outsideCostRecordIds(api, organizationId));'),
], ['import { employerTaxRecordsOf, profitTaxRecordsOf } from "./budgets-reads";',
    'import { outsideCostRecordIds } from "./business-reads";'])
