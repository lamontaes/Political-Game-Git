#!/usr/bin/env python3
"""Economy item 4: split closeTreasuries (src/core2/budgets-treasury.ts) into
named steps, moving its statements verbatim: what the close reads once
(`openClose`), the outside revenue each treasury takes in (`payOutsideRevenue`),
the taxes with named payers (`payNamedInstallments`) and each treasury's own
close (`closeEachTreasury`). Each step takes what the close read (as one
object) and nothing is reordered, renamed or tidied. Structure only: the
records digest stays identical. Re-run on a clean copy of the file."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / "src/core2/budgets-treasury.ts"
lines = PATH.read_text().split("\n")

def find(prefix, start=0):
    for i in range(start, len(lines)):
        if lines[i].startswith(prefix):
            return i
    sys.exit(f"missing: {prefix!r}")

top = find("export function closeTreasuries(api: CoreAPI, source: Source): void {")
end = next(i for i in range(top, len(lines)) if lines[i] == "}")
# the fiscal rules are read from a list (before the registries became fields) or from the modules that carry them (after)
i_rules = next(i for i in range(top, len(lines)) if lines[i] in (
    "  for (const rule of treasuryRules) rule(api);",
    '  for (const rule of fieldsOf(api.state, "treasuryRule")) rule(api);'))
i_tierbase = find("  const tierBase = new Map<string, number>();", i_rules)
i_phase1 = find("  for (const gov of govs) {", i_tierbase)
i_phase2 = find("  // The taxes with named payers: each installment due last month is paid by", i_phase1)
i_phase3 = find("  const providers = providersIndex(api);", i_phase2)
i_tail = find("  sweepReserves(api, govs, budgets, outside, date, source);", i_phase3)

def block(a, b):
    return "\n".join(lines[a:b])

provides = ["accounts", "date", "months", "govs", "budgets", "aided", "fromOutside", "namedCollected", "tier", "tierBase"]
carried = ["api", "source", "outside"]
plan = [
    ("payOutsideRevenue", "The outside revenue each treasury takes in, and the country tier's withholding where the tier carries it.", block(i_phase1, i_phase2)),
    ("payNamedInstallments", "The taxes with named payers: each installment due last month, paid by its group of payers.", block(i_phase2, i_phase3)),
    ("closeEachTreasury", "unused", block(i_phase3, end)),
]

def uses_of(text, names):
    code = re.sub(r'"(?:[^"\\\n]|\\.)*"|//[^\n]*', "", text)  # a template's ${...} can name a variable, so templates stay
    return [n for n in names if re.search(r"(?<![\w.$])" + re.escape(n) + r"\b(?!\s*:)", code)]

out_funcs = []
out_funcs.append("/** What the close reads once: the parameters, the governments in order, each one's budget, the aid lines and the country tier's withholding. */")
out_funcs.append("function openClose(\n  api: CoreAPI,\n  source: Source,\n  outside: string,\n) {")
out_funcs.append(block(i_rules, i_phase1))
out_funcs.append("  return {\n    api,\n    source,\n    outside,\n    " + ",\n    ".join(provides) + ",\n  };\n}\n")
out_funcs.append("type Close = ReturnType<typeof openClose>;\n")
for name, doc, text in plan[:2]:
    uses = uses_of(text, carried + provides)
    out_funcs.append(f"/** {doc} */")
    out_funcs.append(f"function {name}(c: Close): void {{")
    if uses:
        out_funcs.append("  const { " + ", ".join(uses) + " } = c;")
    out_funcs.append(text)
    out_funcs.append("}\n")

# The last phase: what the close sets up for every treasury, then each treasury's own close.
phase3 = lines[i_phase3:i_tail]
tail = "\n".join(lines[i_tail:end])
i_for = next(i for i, l in enumerate(phase3) if l == "  for (const gov of govs) {")
setup3 = "\n".join(phase3[:i_for])
body = phase3[i_for + 1:-1]           # the loop body, without its `for` line and closing brace
assert phase3[-1] == "  }", "the last treasury loop moved"

def seg(start_prefix, end_prefix=None):
    a = next(i for i, l in enumerate(body) if l.startswith(start_prefix))
    b = next((i for i, l in enumerate(body) if i > a and l.startswith(end_prefix)), len(body)) if end_prefix else len(body)
    return a, b

a0, a1 = seg("    // Where the finances record a jurisdiction's whole government at a lower", "    const sinceClose = sinceCloseOf(api, gov.id);")
a2, a3 = seg("    const sinceClose = sinceCloseOf(api, gov.id);", "    const main = accounts.main(gov.organizationId);")
a4, a5 = seg("    const main = accounts.main(gov.organizationId);", "    const lines: Record<string, TreasuryLine> = {};")
a6, a7 = seg("    const lines: Record<string, TreasuryLine> = {};")
segs = [
    ("carryThrough", "A treasury that carries no lines of its own passes what it collected to the government below that carries the budget.", body[a0:a1], []),
    ("planTreasury", "What the treasury owes this month: its lines since the last close, what each is due, the aid it sends and how its purchases are shared with the town's businesses.", body[a2:a3],
     ["sinceClose", "since", "chargedSince", "inTown", "due", "interest", "aid", "lineChanges", "lineAid", "baseAidTotal", "aidTotal", "fromLines", "fromDue", "aidCharged", "awarded", "plan", "need"]),
    ("fundTreasury", "Paying the month: what the treasury holds, what the federal treasury borrows, each line paid in order, and the aid sent down.", body[a4:a5],
     ["main", "have", "borrowed", "borrowedByHolder", "interestByHolder", "scale", "paymentIds", "pay", "payOut", "aidPaid"]),
    ("keepTreasuryMonth", "The month kept: each line's payment, what was left short, and the treasury's month row.", body[a6:a7], []),
]
run_names = carried + provides + ["providers", "aidReceived", "lineLawRows", "lineLawKeys", "total", "gov", "budget"]
later_text = lambda k: "\n".join("\n".join(x[2]) for x in segs[k + 1:])
known = []
fn_defs = []
chain = []
for k, (name, doc, text_lines, adds) in enumerate(segs):
    text = "\n".join(text_lines)
    uses_run = uses_of(text, run_names)
    uses_prev = [n for n in uses_of(text, known)]
    needed_later = [n for n in adds if uses_of(later_text(k), [n])]
    f = [f"/** {doc} */"]
    params = ["r: Run", "gov: Gov", "budget: Budget"]
    if name == "carryThrough":
        f.append(f"function {name}(\n  r: Run,\n  gov: Gov,\n  budget: Budget,\n): boolean {{")
        text = text.replace("continue;", "return true;")
    else:
        prevtype = {"planTreasury": None, "fundTreasury": "Planned", "keepTreasuryMonth": "Funded"}[name]
        sig = ["r: Run", "gov: Gov", "budget: Budget"] + ([f"a: {prevtype}"] if prevtype else [])
        ret = "void" if not needed_later else None
        f.append(f"function {name}(\n  " + ",\n  ".join(sig) + ",\n)" + (": void" if ret else "") + " {")
    uses_run = [u for u in uses_run if u not in ("gov", "budget")]
    if uses_run:
        f.append("  const { " + ", ".join(uses_run) + " } = r;")
    if uses_prev:
        f.append("  const { " + ", ".join(uses_prev) + " } = a;")
    f.append(text)
    if name == "carryThrough":
        f.append("  return false;")
    elif needed_later:
        f.append("  return { " + ", ".join(needed_later) + " };")
    f.append("}\n")
    fn_defs.append("\n".join(f))
    known += needed_later

out_funcs.append("/** What the close sets up for every treasury: who provides each line's work, the aid received, the rows recorded for the laws that raised a line, and a line sum. */")
out_funcs.append("function openRun(c: Close) {")
out_funcs.append("  const { api } = c;")
out_funcs.append(setup3.replace("  const providers", "  const providers", 1))
out_funcs.append("  return { ...c, providers, aidReceived, lineLawRows, lineLawKeys, total };\n}")
out_funcs.append("type Run = ReturnType<typeof openRun>;")
out_funcs.append("type Gov = Close[\"govs\"][number];")
out_funcs.append("type Budget = NonNullable<ReturnType<Close[\"budgets\"][\"get\"]>>;")
out_funcs.append("type Planned = ReturnType<typeof planTreasury>;")
out_funcs.append("type Funded = Planned & ReturnType<typeof fundTreasury>;\n")
out_funcs.append("/** Each treasury's own close, in the order of the governments. */")
out_funcs.append("function closeEachTreasury(c: Close): void {\n  const r = openRun(c);\n  for (const gov of r.govs) closeTreasury(r, gov);\n  settleClose(r);\n}\n")
tail_uses = uses_of(tail, run_names)
out_funcs.append("/** The close's last words: the reserves swept, the federal surplus repaid, the line laws ended, Social Security's level applied and the landed money attributed. */")
out_funcs.append("function settleClose(r: Run): void {\n  const { " + ", ".join(tail_uses) + " } = r;\n" + tail + "\n}\n")
out_funcs.append("/** One treasury's close: it carries its lines or passes them on, plans the month, pays it and keeps it. */")
out_funcs.append("function closeTreasury(r: Run, gov: Gov): void {\n  const budget = r.budgets.get(gov.id);\n  if (!budget) return;\n  if (carryThrough(r, gov, budget)) return;\n  const planned = planTreasury(r, gov, budget);\n  const funded = { ...planned, ...fundTreasury(r, gov, budget, planned) };\n  keepTreasuryMonth(r, gov, budget, funded);\n}\n")
out_funcs.extend(fn_defs)

main = [
    "export function closeTreasuries(api: CoreAPI, source: Source): void {",
    "  const outside = outsideAccountOf(api);",
    "  if (!outside) return;",
    "  const c = openClose(api, source, outside);",
    "  payOutsideRevenue(c);",
    "  payNamedInstallments(c);",
    "  closeEachTreasury(c);",
    "}",
    "",
]
lines[top:end + 1] = ("\n".join(main) + "\n" + "\n".join(out_funcs)).split("\n")
PATH.write_text("\n".join(lines))
print("closeTreasuries split into openClose, payOutsideRevenue, payNamedInstallments and closeEachTreasury")
