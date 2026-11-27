#!/usr/bin/env python3
"""Economy item 5, family 4: the country tier's side registry for the reader of
every state's people and movers becomes the field `countryFlows` the macro
module carries, read through module-fields.ts (Core item 10, #10768).
Re-runnable: each edit prints applied, already or MISSED, and a miss exits 1
without writing that file."""
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

edit("src/core2/country-model.ts", [
    ("""let flowsReader: CountryFlowsReader | null = null;
/** The economy engine names its reader of the tier's flows (it reads modules the movers' engine cannot import). */
export function registerCountryFlowsReader(reader: CountryFlowsReader): void {
  flowsReader = reader;
}
""", ""),
    ("  return flowsReader?.(api) ?? { states: [], flows: [] };", """  // The economy's module carries its reader of the tier's flows (`countryFlows`; it reads modules the movers' engine cannot import).
  const carrier = carriersOf(api.state, "countryFlows")[0];
  return (
    (carrier?.countryFlows?.(api) as
      | ReturnType<CountryFlowsReader>
      | undefined) ?? { states: [], flows: [] }
  );"""),
], imports=['import { carriersOf } from "./module-fields";'])
edit("src/core2/modules/macro.ts", [
    ("  registerCountryFlowsReader,\n", ""),
    ("registerCountryFlowsReader(countryFlowsNow);\n\n", ""),
    ("export const MACRO_MODULE: PreStartModule = {\n  id: MACRO_MODULE_ID,\n", "export const MACRO_MODULE: PreStartModule = {\n  id: MACRO_MODULE_ID,\n  // Every state's people and this month's movers, as the economy engine reads them (the movers' engine asks for it).\n  countryFlows: countryFlowsNow,\n"),
])
if missed:
    print(f"{len(missed)} edit(s) missed; nothing written in those files.")
    sys.exit(1)
