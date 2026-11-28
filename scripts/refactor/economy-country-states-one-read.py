#!/usr/bin/env python3
"""Economy: macro's `countryStates` and the door `allCountryStates` differ only by a guard (the door returns none where the economy is not kept). One read stays: the door. Every other caller switches to it; macro.ts keeps a private `countryStateRows` for its own steps. Re-runnable: prints applied / already / MISSED per file; exits 1 without writing on a miss."""
import os, re, subprocess, sys
CORE = "src/core2"
files = subprocess.check_output(r"grep -rlE '\bcountryStates\(' src tests scripts --include=*.ts", shell=True, text=True).split()
out, miss = {}, False
for f in files:
    s = open(f).read()
    if f == f"{CORE}/modules/macro.ts":
        a = '''/** Every state's tier row today: its households by fifth and age, its sectors and its ledger. Read-only. */
export function countryStates(api: CoreAPI): readonly CountryState[] {'''
        b = '''/** Every state's tier row, for the macro engine's own steps (other engines read them through `allCountryStates`). */
function countryStateRows(api: CoreAPI): readonly CountryState[] {'''
        if a not in s:
            print("MISSED", f); miss = True; continue
        s = s.replace(a, b).replace("const states = countryStates(api);", "const states = countryStateRows(api);")
        out[f] = s; print("applied", f); continue
    # drop the specifier from any import of the macro module
    def drop(m):
        names = [n.strip() for n in m.group(1).split(",") if n.strip()]
        names = [n for n in names if n != "countryStates"]
        if not names:
            return ""
        return "import { " + ", ".join(names) + " } from " + m.group(2) + ";\n"
    s2 = re.sub(r'import \{([^}]*)\} from ("[^"]*modules/macro"|"\./macro");\n', lambda m: drop(m) if "countryStates" in m.group(1) else m.group(0), s)
    if s2 == s:
        print("MISSED", f, "(no macro import with countryStates)"); miss = True; continue
    rel = os.path.relpath(f"{CORE}/macro-reads", os.path.dirname(f))
    if not rel.startswith("."): rel = "./" + rel
    if "allCountryStates" not in s2.split("countryStates(")[0]:
        # add the import after the last import line
        lines = s2.split("\n")
        last = max(i for i, l in enumerate(lines) if re.match(r'^(import .*;|\} from ".*";)$', l))
        lines.insert(last + 1, f'import {{ allCountryStates }} from "{rel}";')
        s2 = "\n".join(lines)
    s2 = re.sub(r'\bcountryStates\(', "allCountryStates(", s2)
    out[f] = s2; print("applied", f)
if miss: sys.exit(1)
for f, s in out.items(): open(f, "w").write(s)
