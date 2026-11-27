#!/usr/bin/env python3
"""
Lawmaking item 7 (LW3), family four: what the office day gives the world's legislating
(a bill introduced, a meeting held and its agenda filed, a leader's refusal) moves from
three single-slot registries filled when two files load onto CoreModule fields their
modules carry (`billIntroduced`, `meetingHold`, `leaderRefusalReader`), read in
world-legislating.ts with fieldsOf. registerBillIntroduced, registerMeetingHold and
registerLeaderRefusalReader go.

  python3 scripts/refactor/world-legislating-hooks-fields.py          rewrite the files
  python3 scripts/refactor/world-legislating-hooks-fields.py --check  exit 1 if not yet moved

Re-runnable: it does nothing when the fields are already carried.
"""
import re
import sys

WL = "src/core2/modules/world-legislating.ts"
ODS = "src/core2/office-day-state.ts"
OD = "src/core2/modules/office-day.ts"
wl, ods, od = (open(p).read() for p in (WL, ODS, OD))
if "billIntroduced: " in ods:
    print("already moved")
    sys.exit(0)
if "--check" in sys.argv:
    print("not moved")
    sys.exit(1)


def once(text, old, new):
    assert text.count(old) == 1, (text.count(old), old[:80])
    return text.replace(old, new, 1)


def drop(text, start, end):
    i = text.index(start)
    j = text.index(end, i) + len(end)
    return text[:i] + text[j:]


# ---- world-legislating.ts: the readers
wl = once(wl, "  billIntroduced?.(api, bill.id);", '  for (const hook of fieldsOf(api.state as CoreState, "billIntroduced"))\n    hook(api, bill.id);')
wl = once(wl, "    filedAgenda?.(api, input.body.id, input.holdFor, heldIds);", '    meetingHold(api)?.filed(api, input.body.id, input.holdFor, heldIds);')
assert wl.count("!!meetingHold?.(api, officeId)") == 1
wl = wl.replace("!!meetingHold?.(api, officeId)", "!!meetingHold(api)?.hold(api, officeId)")
assert wl.count("!meetingHold?.(api, officeId)") == 1
wl = wl.replace("!meetingHold?.(api, officeId)", "!meetingHold(api)?.hold(api, officeId)")
wl = once(
    wl,
    "const refusedByLeader = (api: CoreAPI, billId: string): boolean =>\n  leaderRefused?.(api, billId) ?? false;",
    'const refusedByLeader = (api: CoreAPI, billId: string): boolean =>\n  fieldsOf(api.state as CoreState, "leaderRefusalReader").some((reads) =>\n    reads(api, billId),\n  );',
)
# the registries, their types and variables go; the reader of the meeting hold is one small function
wl = drop(wl, "type BillIntroduced = (api: CoreAPI, billId: string) => void;\nlet billIntroduced:", "  billIntroduced = hook;\n}\n")
wl = drop(wl, "let meetingHold: MeetingHold | null = null;\nlet filedAgenda:", "  filedAgenda = filed;\n}\n")
wl = once(
    wl,
    "const QUESTION_SCOPES =",
    '/** The office day\'s say on whether a body\'s meeting is held and what it does with the agenda filed for it, if its module is installed. */\nconst meetingHold = (api: CoreAPI) =>\n  fieldsOf(api.state as CoreState, "meetingHold")[0];\n\nconst QUESTION_SCOPES =',
)
wl = drop(wl, "let leaderRefused:", "  leaderRefused = reader;\n}\n")
# the leftover type aliases for the old registry signatures
for t in ("type MeetingHold = ", "type FiledAgenda = "):
    if t in wl:
        i = wl.index(t)
        j = wl.index(";\n", i) + 2
        wl = wl[:i] + wl[j:]
if 'import { fieldsOf } from "../module-fields";' not in wl:
    wl = once(wl, 'import { campaignParameter, PLATFORM_QUESTIONS } from "../campaign-data";', 'import { campaignParameter, PLATFORM_QUESTIONS } from "../campaign-data";\nimport { fieldsOf } from "../module-fields";')

# ---- office-day-state.ts: the two registrations become named functions the module carries
ods = once(ods, "registerBillIntroduced((api, billId) => {", "function leaderHearingAsked(api: CoreAPI, billId: string): void {")
i = ods.index("function leaderHearingAsked(")
j = ods.index("\n});\n", i)
ods = ods[:j] + "\n}\n" + ods[j + len("\n});\n"):]
k = ods.index("registerLeaderRefusalReader(\n  (api, billId) =>\n")
m = ods.index("\n);\n", k)
expr = ods[k + len("registerLeaderRefusalReader(\n  (api, billId) =>\n"):m]
expr = expr.rstrip().rstrip(",")
ods = ods[:k] + "function leaderRefused(api: CoreAPI, billId: string): boolean {\n  return (\n" + expr + "\n  );\n}" + ods[m + len("\n);"):]
ods = once(ods, "  registerBillIntroduced,\n", "")
ods = once(ods, "  registerLeaderRefusalReader,\n", "")
ods = once(
    ods,
    "  onCalendarWork: governorAddressDay,\n};",
    "  onCalendarWork: governorAddressDay,\n  // What the world's legislating asks the office day: a leader's hearing for a new bill, and whether a leader refused one.\n  billIntroduced: leaderHearingAsked,\n  leaderRefusalReader: leaderRefused,\n};",
)

# ---- office-day.ts: the meeting hold is a field the module carries
od = once(od, "registerMeetingHold(holdsMemberFilings, placeFiled);\n", "")
od = once(od, "  registerMeetingHold,\n", "")
i = od.index("export const OFFICE_DAY_MODULE: CoreModule = {")
j = od.index("\n};\n", i)
od = od[:j] + "\n  // Whether a body's meeting is held, and what it does with the agenda filed for it.\n  meetingHold: { hold: holdsMemberFilings, filed: placeFiled },"+ od[j:]
open(WL, "w").write(wl)
open(ODS, "w").write(ods)
open(OD, "w").write(od)
print("moved billIntroduced, meetingHold and leaderRefusalReader onto fields")
