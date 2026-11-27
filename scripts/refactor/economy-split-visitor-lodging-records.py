#!/usr/bin/env python3
"""Economy item 4: split visitorLodgingRecords (src/core2/finance-cash.ts) into
named steps, moving its statements verbatim: the records read, the visit's
checks, the geography, the sources, the family budget's envelope and the
product qualifications. Each step takes what the steps before it made (passed
along as one object) and returns what it adds; the checks that throw stay in
the order they were in. Nothing is reordered, renamed or tidied. Structure
only: the records digest stays identical. Re-run on a clean copy of the file."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / "src/core2/finance-cash.ts"
lines = PATH.read_text().split("\n")

def find(prefix, start=0):
    for i in range(start, len(lines)):
        if lines[i].startswith(prefix):
            return i
    sys.exit(f"missing: {prefix!r}")

top = find("function visitorLodgingRecords(")
end = next(i for i in range(top, len(lines)) if lines[i] == "}")
i_body = find("  const r = session.reads,", top)
i_check = find("  if (\n    !owner ||".split("\n")[0], i_body)   # first `  if (` after the reads
while not lines[i_check + 1].startswith("    !owner ||"):
    i_check = find("  if (", i_check + 1)
i_geo = find("  // The visitors come from a place the world doesn't live in", i_check)
i_src = find("  const identitySource = source(", i_geo)
i_budget = find('  const budget = read(r.field(rule, "ownerBudgetMetadataPrefix"), ownerId),', i_src)
i_bsrc = find("  const budgetSource = source(", i_budget)

def block(a, b):
    return "\n".join(lines[a:b])

params = ["session", "row", "relations", "inflow"]
plan = [
 ("readVisit", "The visit's records read from the saved place metadata: the identity, the visit, the market and the owner.", block(i_body, i_check),
  ["r", "cfg", "rule", "ownerId", "identityId", "visitId", "marketId", "read", "identityRecord", "visit", "market", "owner", "facts", "identityFacts", "marketBasis", "visitBasis"], None),
 ("checkVisit", "The identity, the visit and the market must agree with their owner and their geography.", block(i_check, i_geo), [], "Read"),
 ("checkOrigin", "The visitors come from a place the world doesn't live in.", block(i_geo, i_src), [], "Read"),
 ("checkSources", "The sources of the identity, the visit and the market, and the family budget's record id.", block(i_src, i_budget), ["identitySource", "visitSource", "marketSource", "budgetId"], "Read"),
 ("checkBudget", "The owning family's budget: its markets and shares, and the contracts it preserved.", block(i_budget, i_bsrc), ["budget", "budgetMarkets", "budgetAmounts"], "Sourced"),
 ("witnessVisit", "The budget's source and the product qualifications, the customer's allocation, and the witness the visit comes to.", block(i_bsrc, end), [], "Budgeted"),
]
known = list(params)
funcs = []
# The only spelling a split changes: `owner` was narrowed by the throw in the visit's checks, which is another step now.
fixes = {"checkSources": [('r.field(owner, "source")', 'r.field(owner!, "source")')]}
for name, doc_text, text, adds, takes in plan:
    for old, new in fixes.get(name, []):
        if old not in text:
            sys.exit(f"{name}: expected text not found: {old!r}")
        text = text.replace(old, new, 1)
    code = re.sub(r'"(?:[^"\\\n]|\\.)*"|//[^\n]*', "", text)
    uses = [n for n in known if re.search(r"(?<![\w.$])" + re.escape(n) + r"\b(?!\s*:)", code)]
    uses = [u for u in uses if u not in adds]
    out = [f"/** {doc_text} */"]
    if takes is None:
        out.append(f"function {name}(a: VisitParams) {{")
    else:
        out.append(f"function {name}(a: {takes}) {{")
    if uses:
        out.append("  const { " + ", ".join(uses) + " } = a;")
    out.append(text)
    if adds:
        out.append("  return { " + ", ".join(adds) + " };")
    out.append("}\n")
    funcs.append("\n".join(out))
    known += adds

types = """type VisitParams = {
  session: FinancePlanningSession;
  row: FinanceContractState;
  relations: Relations;
  inflow: FinanceVisitorLodgingExternalInflow;
};
type Read = VisitParams & ReturnType<typeof readVisit>;
type Sourced = Read & ReturnType<typeof checkSources>;
type Budgeted = Sourced & ReturnType<typeof checkBudget>;
"""
main = """function visitorLodgingRecords(
  session: FinancePlanningSession,
  row: FinanceContractState,
  relations: Relations,
  inflow: FinanceVisitorLodgingExternalInflow,
): VisitorLodgingWitness {
  const params = { session, row, relations, inflow };
  const read = { ...params, ...readVisit(params) };
  checkVisit(read);
  checkOrigin(read);
  const sourced = { ...read, ...checkSources(read) };
  const budgeted = { ...sourced, ...checkBudget(sourced) };
  return witnessVisit(budgeted);
}
"""
new = main + "\n" + "\n".join(funcs) + "\n" + types
lines[top:end + 1] = new.split("\n")
PATH.write_text("\n".join(lines))
print("visitorLodgingRecords split:", ", ".join(p[0] for p in plan))
