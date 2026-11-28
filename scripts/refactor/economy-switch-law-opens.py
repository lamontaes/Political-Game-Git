#!/usr/bin/env python3
"""Economy goal item 2: Economy's direct opens of the laws engine's table
(budgets.ts 2, budgets-treasury.ts 1, question-wages.ts 2, place-prices.ts 1)
read the laws engine's doors instead (`lawRowById`, `storedLawRowsOfSeries`,
modules/laws-reads.ts, Lawmaking's). Re-runnable: each edit prints applied,
already or MISSED; a miss exits 1 without writing that file."""
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
            print(f"applied  {path} import {line[:60]}")
    p.write_text(out)

edit("src/core2/modules/budgets.ts", [
    ("""  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const row = (laws.get(id) ?? laws.get(id.split("#")[0]!)) as unknown as
    { terms?: { enactedBy?: unknown } } | undefined;""",
     """  const row = (lawRowById(api, id) ??
    lawRowById(api, id.split("#")[0]!)) as unknown as
    { terms?: { enactedBy?: unknown } } | undefined;"""),
    ("""    const recorded = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeriesOnly", [series]) as unknown as readonly LawRowInput[];""",
     """    const recorded = storedLawRowsOfSeries(api, series);"""),
], imports=['import { lawRowById, storedLawRowsOfSeries } from "./laws-reads";'])
edit("src/core2/budgets-treasury.ts", [
    ("""    ? (api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as unknown as
        { series?: string } | undefined)""",
     """    ? (lawRowById(api, lawId) as unknown as { series?: string } | undefined)"""),
], imports=['import { lawRowById } from "./modules/laws-reads";'])
edit("src/core2/question-wages.ts", [
    ("""  const rows = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeries", [jurisdiction, question]) as unknown as LawRowInput[]
  )
    .filter(""", """  const rows = [...storedLawRowsOfSeries(api, question, jurisdiction)]
    .filter("""),
    ("""    (
      api.moduleState(LAWS_MODULE_ID).table("laws").get(change.lawId) as
        { terms?: { centuryRecordId?: string } } | undefined
    )?.terms?.centuryRecordId !== undefined;""",
     """    (
      lawRowById(api, change.lawId) as
        { terms?: { centuryRecordId?: string } } | undefined
    )?.terms?.centuryRecordId !== undefined;"""),
    ("  lawInForce,\n  LAWS_MODULE_ID,\n  yesLevels,\n} from \"./modules/laws\";\nimport type { LawRowInput } from \"./laws-in-force\";\n", "  lawInForce,\n  yesLevels,\n} from \"./modules/laws\";\n"),
], imports=['import { lawRowById, storedLawRowsOfSeries } from "./modules/laws-reads";'])
edit("src/core2/modules/place-prices.ts", [
    ("""    api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as unknown as
      { series?: string } | undefined""",
     """    lawRowById(api, lawId) as unknown as { series?: string } | undefined"""),
], imports=['import { lawRowById } from "./laws-reads";'])
if missed:
    print(f"{len(missed)} edit(s) missed; nothing written in those files.")
    sys.exit(1)
