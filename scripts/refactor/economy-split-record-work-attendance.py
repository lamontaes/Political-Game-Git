#!/usr/bin/env python3
"""Economy item 4: split recordWorkAttendance (src/core2/work-attendance.ts)
into named steps, moving its statements verbatim. Each step takes what the
steps before it made (the locals the function built, passed along as one
object) and returns what it adds; the validation that runs only with
bookkeeping on stays in its own steps. Nothing is reordered, renamed or tidied.
Structure only: the records digest stays identical. Re-run on a clean copy of
the file."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / "src/core2/work-attendance.ts"
lines = PATH.read_text().split("\n")

def find(prefix, start=0):
    for i in range(start, len(lines)):
        if lines[i].startswith(prefix):
            return i
    sys.exit(f"missing: {prefix!r}")

top = find("export function recordWorkAttendance(")
doc = top - 1
assert lines[doc].startswith("/** Validates and commits attendance"), "doc line moved"
end = next(i for i in range(top, len(lines)) if lines[i] == "}")
i_play = find("  const play = !bookkeeping(),", top)
i_let = find("  let commitment: {", i_play)
i_if1 = find("  if (!play) {", i_let)
i_owner = find("  const owner = basis(batch", i_if1)
i_if2 = find("  if (!play) {", i_owner + 3)
assert lines[i_if2 + 1].startswith("    if (!input.decision)"), "decision block moved"
i_selected = find("  const selected = input.decision!.selected!,", i_if2)
i_actor = find("  nextActor.lastChoice = selectedId;", i_selected)
i_totals = find('  const totals = r.field(work, "totalsByJob"),', i_actor)
i_week = find("  const week = workWeekStart(date, viewApi),", i_totals)
i_age = find("  const ageRows = r.array(", i_week)
i_ledger = find("  batch.map(ledger, commitment.id, detached(r, earned.ledger));", i_age)
i_commit = find("  batch.commit(controlSnapshot);", i_ledger)
i_detail = max(i for i in range(i_ledger, i_commit) if lines[i] == "  if (detailed) {")

def block(a, b):
    return "\n".join(lines[a:b])

let_commitment = """  let commitment: {
      id: string;
      jobId: string;
      personId: string;
      organizationId: string;
    } = row,
    actorView = actor;"""
let_decision = """  let reasons: DecisionResult["selectedReasons"],
    compactChoice: WorkAttendanceResult["compactChoice"],
    todayView = today as
      | { date: string; workMinutes: number; discretionaryMinutes: number }
      | undefined,
    viewApi = api;"""

# (name, doc, text, names it adds, the type it receives)
plan = [
 ("readAttendance", "The attendance's rows read: the work policy, the commitment, the actor, the job, the previous attendance and the payroll calendar.", block(i_play, i_let),
  ["core", "api", "play", "controlSnapshot", "batch", "r", "input", "work", "data", "date", "zero", "one", "row", "actor", "job", "previous", "calendarId", "calendar", "today"], None),
 ("viewCommitment", "The commitment as the validator reads it, and the actor to write.", let_commitment + "\n" + block(i_if1, i_owner), ["commitment", "actorView"], "Read"),
 ("bindOwner", "Who owns the pay and the schedule, and whether the attendance is kept in detail.", block(i_owner, i_if2), ["owner", "ownedCalendarId", "detailed"], "Viewed"),
 ("admitDecision", "The selected choice, checked against what the validator reads (or taken as it stands in play).", let_decision + "\n" + block(i_if2, i_selected), ["reasons", "compactChoice", "todayView", "viewApi"], "Owned"),
 ("priceAttendance", "The attendance priced: its action, the pay period it falls in, what it earns and the result it keeps.", block(i_selected, i_actor),
  ["selected", "definition", "offer", "attendance", "monthsPerYear", "selectedId", "actionKind", "attended", "before", "after", "sourceActId", "resolved", "periodId", "periods", "ledger", "originalPeriod", "priorLedger", "earned", "full", "stored", "caller", "nextActor"], "Decided"),
 ("writeActor", "The actor's last choice, act count, acts by kind and this month's act counters.", block(i_actor, i_totals), [], "Priced"),
 ("writeTotals", "The job's totals, the current attendance index, the last attendance and today's time.", block(i_totals, i_week), [], "Priced"),
 ("writeRollups", "The week's rollup for the job.", block(i_week, i_age), [], "Priced"),
 ("writePrimaryTime", "The primary-time total for paid work at the actor's age.", block(i_age, i_ledger), [], "Priced"),
 ("writePeriod", "The payroll ledger, the earned pay period and its indexes.", block(i_ledger, i_detail), [], "Priced"),
 ("writeTrace", "The attendance act's trace and what the worker knows of it, kept only when the attendance is watched.", block(i_detail, i_commit), [], "Priced"),
]

known = []
funcs = []
for name, doc_text, text, adds, takes in plan:
    code = re.sub(r'"(?:[^"\\\n]|\\.)*"|//[^\n]*', "", text)  # strings and comments name no variable
    uses = [n for n in known if re.search(r"(?<![\w.$])" + re.escape(n) + r"\b(?!\s*:)", code)]
    # `row` in the age lookup is the callback's own parameter, not the commitment's row
    uses = [u for u in uses if u not in adds and not (name == "writePrimaryTime" and u == "row")]
    out = [f"/** {doc_text} */"]
    if takes is None:
        out.append(f"function {name}(\n  core: CoreState,\n  api: CoreAPI,\n  raw: WorkAttendanceInput,\n) {{")
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

types = """type Read = ReturnType<typeof readAttendance>;
type Viewed = Read & ReturnType<typeof viewCommitment>;
type Owned = Viewed & ReturnType<typeof bindOwner>;
type Decided = Owned & ReturnType<typeof admitDecision>;
type Priced = Decided & ReturnType<typeof priceAttendance>;
"""

main = f"""{lines[doc]}
export function recordWorkAttendance(
  core: CoreState,
  api: CoreAPI,
  raw: WorkAttendanceInput,
): WorkAttendanceResult {{
  const read = readAttendance(core, api, raw);
  const viewed = {{ ...read, ...viewCommitment(read) }};
  const owned = {{ ...viewed, ...bindOwner(viewed) }};
  const decided = {{ ...owned, ...admitDecision(owned) }};
  const priced = {{ ...decided, ...priceAttendance(decided) }};
  writeActor(priced);
  writeTotals(priced);
  writeRollups(priced);
  writePrimaryTime(priced);
  writePeriod(priced);
  writeTrace(priced);
  priced.batch.commit(priced.controlSnapshot);
  return priced.caller;
}}
"""
new = main + "\n" + "\n".join(funcs[:1]) + "\n" + "\n".join(funcs[1:]) + "\n" + types
lines[doc:end + 1] = new.split("\n")
PATH.write_text("\n".join(lines))
print("recordWorkAttendance split:", ", ".join(p[0] for p in plan))
