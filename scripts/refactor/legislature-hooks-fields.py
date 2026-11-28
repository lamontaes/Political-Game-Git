#!/usr/bin/env python3
"""
Lawmaking item 7 (LW3), family five: what other engines add to the legislature (hooks
before and after a vote and on the executive's desk, a position term, the committee
that waits for a meeting, the budget meeting, the meetings' agenda and a hearing's
witnesses) moves from registries the engines filled when they opened or loaded onto
CoreModule fields their modules carry (`legislatureHooks`, `committeeWait`,
`budgetMeeting`, `meetingAgendaReader`, `hearingWitnesses`), read in legislature.ts with
fieldsOf. The eight register* functions go.

  python3 scripts/refactor/legislature-hooks-fields.py          rewrite the files
  python3 scripts/refactor/legislature-hooks-fields.py --check  exit 1 if not yet moved

Re-runnable: it does nothing when the fields are already carried.
"""
import re
import sys

LEG = "src/core2/modules/legislature.ts"
OD = "src/core2/modules/office-day.ts"
IG = "src/core2/modules/interest-groups.ts"
MT = "src/core2/modules/meetings.ts"
ST = "src/core2/modules/staff.ts"
BS = "src/core2/office-day-budget-season.test.ts"
TY = "src/core2/types.ts"
leg, od, ig, mt, ty, st, bs = (open(p).read() for p in (LEG, OD, IG, MT, TY, ST, BS))
if "hearingWitnesses: hearingWitnesses" in ig:
    print("already moved")
    sys.exit(0)
if "--check" in sys.argv:
    print("not moved")
    sys.exit(1)


def once(text, old, new):
    assert text.count(old) == 1, (text.count(old), old[:90])
    return text.replace(old, new, 1)


def drop(text, start, end):
    i = text.index(start)
    j = text.index(end, i) + len(end)
    return text[:i] + text[j:]


# ---- types.ts: the hearing's provider is asked about a question
ty = once(
    ty,
    "  hearingWitnesses?(api: CoreAPI, bill: unknown): readonly unknown[];",
    "  hearingWitnesses?(\n    api: CoreAPI,\n    bill: unknown,\n    question: string,\n  ): readonly unknown[];",
)

# ---- legislature.ts: the readers
leg = once(leg, "    if (committeeWaits?.(api, bill)) continue;", '    if (\n      fieldsOf(api.state as CoreState, "committeeWait").some((wait) =>\n        wait(api, bill),\n      )\n    )\n      continue;')
leg = drop(leg, "let committeeWaits:", "  committeeWaits = wait;\n}\n")
leg = once(
    leg,
    "  const lobby = positionTerms.reduce(\n    (sum, term) => sum + term(api, bill, memberId),\n    0,\n  );",
    "  const lobby = legislatureHooksOf(api).reduce(\n    (sum, hooks) => sum + (hooks.positionTerm?.(api, bill, memberId) ?? 0),\n    0,\n  );",
)
leg = once(
    leg,
    "  for (const hook of beforeVoteHooks) {\n",
    "  for (const hook of legislatureHooksOf(api).flatMap((hooks) =>\n    hooks.beforeVote ? [hooks.beforeVote] : [],\n  )) {\n",
)
assert leg.count("for (const hook of afterVoteHooks) hook(api, billId);") == 2
leg = leg.replace(
    "for (const hook of afterVoteHooks) hook(api, billId);",
    "for (const hooks of legislatureHooksOf(api)) hooks.afterVote?.(api, billId);",
)
n = len(re.findall(r"for \(const hook of deskHooks\)(\s+)hook\(api,", leg))
assert n == 3, n
leg = re.sub(r"for \(const hook of deskHooks\)(\s+)hook\(api,", r"for (const hooks of legislatureHooksOf(api))\1hooks.onDesk?.(api,", leg)
# the hooks' registry, its variables and its register function go; the stage set and the desk's type stay
leg = once(leg, "type PositionTerm = (api: CoreAPI, bill: BillRow, memberId: string) => number;\nconst positionTerms: PositionTerm[] = [];\n", "")
leg = drop(leg, "/** The pre-vote hooks, by name; the data says which run on a committee's day. */\nconst beforeVoteHooks:", "}[] = [];\n")
leg = once(leg, "const afterVoteHooks: ((api: CoreAPI, billId: string) => void)[] = [];\n", "")
leg = once(leg, "const deskHooks: ((api: CoreAPI, action: DeskAction) => void)[] = [];\n", "")
leg = drop(leg, "/**\n * Other engines add to a member's reasons (organized interests lobbying)", "    deskHooks.push(input.onDesk);\n}\n")
leg = once(
    leg,
    "const committeeStageHooks = new Set(committeeDayData.committeeStage);",
    '''const committeeStageHooks = new Set(committeeDayData.committeeStage);
/**
 * What other engines add to the legislature (organized interests lobbying, groups
 * forming from a fiscal note, what the executive's desk keeps): the hooks each
 * installed module carries, in install order. The data says which pre-vote hooks
 * run on a committee's day.
 */
function legislatureHooksOf(api: CoreAPI) {
  return fieldsOf(api.state as CoreState, "legislatureHooks");
}''',
)
# the budget meeting
leg = once(leg, "  budgetMeeting?.place(api, bill.id, `${fy}-${gov.fiscalYearStart}`);", '  fieldsOf(api.state as CoreState, "budgetMeeting")[0]?.place(\n    api,\n    bill.id,\n    `${fy}-${gov.fiscalYearStart}`,\n  );')
leg = once(leg, "  return budgetMeeting?.votes(api, bill.id) ?? false;", '  return (\n    fieldsOf(api.state as CoreState, "budgetMeeting")[0]?.votes(api, bill.id) ??\n    false\n  );')
leg = drop(leg, "/** The meetings engine: puts a budget on its body's agenda for its vote day", "  budgetMeeting = input;\n}\n")
# the meetings' agenda
leg = once(leg, "    ...(meetingAgendaReader?.(api, date) ?? []),", '    ...(fieldsOf(api.state as CoreState, "meetingAgendaReader")[0]?.(api, date) ??\n      []),')
leg = drop(leg, "let meetingAgendaReader:", "  meetingAgendaReader = reader;\n}\n")
# the hearing's witnesses
leg = once(
    leg,
    "    for (const provider of hearingWitnessProviders)\n      for (const w of provider(api, bill, question.question)) {",
    '    for (const provider of fieldsOf(api.state as CoreState, "hearingWitnesses"))\n      for (const w of provider(\n        api,\n        bill,\n        question.question,\n      ) as readonly HearingWitness[]) {',
)
leg = once(leg, "const hearingWitnessProviders: HearingWitnessProvider[] = [];\n", "")
leg = once(leg, "/** Who else a hearing hears on a bill's question, from another engine's records (the interest groups). */\ntype HearingWitnessProvider = (\n  api: CoreAPI,\n  bill: BillRow,\n  question: string,\n) => readonly HearingWitness[];\n", "")
leg = drop(leg, "/** An engine says who testifies on a question: the people its records show are concerned with it. */\nexport function registerHearingWitnessProvider(", "    hearingWitnessProviders.push(provider);\n}\n")
if 'import { fieldsOf } from "../module-fields";' not in leg:
    leg = once(leg, 'import { campaignParameter } from "../campaign-data";', 'import { campaignParameter } from "../campaign-data";\nimport { fieldsOf } from "../module-fields";')

# ---- office-day.ts: the module carries what the office day adds to the legislature
od = once(od, '  registerLegislatureHooks({\n    beforeVote: { name: "own-vote", run: ownVote, castsVote: true },\n    onDesk: deskArrived,\n  });\n  registerBudgetMeeting({ place: placeBudgetVote, votes: votesBudgetToday });\n', "")
od = once(od, "registerCommitteeWait((api, bill) => {", "function committeeWaitsOnPlayer(api: CoreAPI, bill: BillRow): boolean {")
k = od.index("function committeeWaitsOnPlayer(")
e = od.index("\n});\n", k)
od = od[:e] + "\n}\n" + od[e + len("\n});\n"):]
od = once(od, "registerMeetingAgendaReader((api, date) =>\n", "function townMeetingAgenda(api: CoreAPI, date: string): readonly string[] {\n  return (\n")
k = od.index("function townMeetingAgenda(")
e = od.index("\n);\n", k)
head = od[:e].rstrip()
if head.endswith(","):
    head = head[:-1]
od = head + "\n  );\n}\n" + od[e + len("\n);\n"):]
od = re.sub(r"\n  registerLegislatureHooks,", "", od, count=1)
od = re.sub(r"\n  registerBudgetMeeting,", "", od, count=1)
od = re.sub(r"\n  registerCommitteeWait,", "", od, count=1)
od = re.sub(r"\n  registerMeetingAgendaReader,", "", od, count=1)
i = od.index("export const OFFICE_DAY_MODULE: CoreModule = {")
j = od.index("\n};\n", i)
od = od[:j] + '''
  // What the office day adds to the legislature: the player's own vote, the desk's arrival, the budget meeting, the committee that waits for a meeting and the meetings' agenda.
  legislatureHooks: {
    beforeVote: { name: "own-vote", run: ownVote, castsVote: true },
    onDesk: deskArrived,
  },
  budgetMeeting: { place: placeBudgetVote, votes: votesBudgetToday },
  committeeWait: committeeWaitsOnPlayer,
  meetingAgendaReader: townMeetingAgenda,''' + od[j:]

# ---- interest-groups.ts
ig = once(ig, "  // Registered here, not at import: the legislature module is still loading when this file is.\n  registerHearingWitnessProvider(hearingWitnesses);\n", "")
k = ig.index("  registerLegislatureHooks({\n    beforeVote: { name: \"interest-organize\"")
e = ig.index("\n  });\n}\n", k)
hooks_text = ig[k:e + len("\n  });\n")]
ig = ig[:k] + ig[e + len("\n  });\n"):]
ig = ig.replace("\n  registerHearingWitnessProvider,", "", 1).replace("\n  registerLegislatureHooks,", "", 1)
after = hooks_text[hooks_text.index("    afterVote: (api, billId) => {"):]
s0 = after.index("(api, billId) => {")
e0 = after.index("\n    },\n")
fn_text = after[s0 : e0 + len("\n    }")]
body = fn_text[fn_text.index("{") + 1 :]
settle = "function settleBribesAfterVote(api: CoreAPI, billId: string): void {" + body
ig = ig.rstrip("\n") + "\n\n/** A bribe taken on the bill is settled by how the official voted. */\n" + "\n".join(l[4:] if l.startswith("    ") else l for l in settle.split("\n")) + "\n"
i = ig.index("export const INTEREST_GROUPS_MODULE: CoreModule = {")
j = ig.index("\n};\n", i)
ig = ig[:j] + '''
  // What the interest groups add to the legislature: who testifies on a question, how groups organize before a vote, the lobbying term in a member's position and the settling of a bribe after the vote.
  hearingWitnesses,
  legislatureHooks: {
    beforeVote: { name: "interest-organize", run: organize },
    positionTerm: lobbyTerm,
    afterVote: settleBribesAfterVote,
  },''' + ig[j:]

# ---- meetings.ts
mt = once(mt, '  registerLegislatureHooks({\n    beforeVote: { name: "public-comment", run: publicComment },\n    positionTerm: roomTerm,\n  });\n', "")
mt = mt.replace("\n  registerLegislatureHooks,", "", 1)
i = mt.index("const MEETINGS_MODULE: CoreModule = {")
j = mt.index("\n};\n", i)
mt = mt[:j] + '''
  // What the meetings add to the legislature: a public comment before a vote and the room's term in a member's position.
  legislatureHooks: {
    beforeVote: { name: "public-comment", run: publicComment },
    positionTerm: roomTerm,
  },''' + mt[j:]


# ---- staff.ts
st = once(st, '  registerLegislatureHooks({\n    beforeVote: { name: "staff-brief", run: briefBeforeVote },\n  });\n', "")
st = once(st, "  registerLegislatureHooks,\n", "")
i = st.index("const STAFF_MODULE: CoreModule = {")
j = st.index("\n};\n", i)
st = st[:j] + '\n  // What the staff add to the legislature: the brief a member is given before a vote.\n  legislatureHooks: {\n    beforeVote: { name: "staff-brief", run: briefBeforeVote },\n  },' + st[j:]

# ---- office-day-budget-season.test.ts: the test's own hook is a field of a module it installs
bs = once(bs, "registerLegislatureHooks({\n  beforeVote: {\n    name: \"budget-season-test\",\n    run: (_api, billId) =>\n      hookRuns.set(billId, (hookRuns.get(billId) ?? 0) + 1),\n  },\n});\n", 'const HOOK_MODULE: CoreModule = {\n  id: "budget-season-test-hook",\n  state: { schemaVersion: 1, tables: {} },\n  legislatureHooks: {\n    beforeVote: {\n      name: "budget-season-test",\n      run: (_api, billId) =>\n        hookRuns.set(billId, (hookRuns.get(billId) ?? 0) + 1),\n    },\n  },\n};\n')
bs = once(bs, "  registerLegislatureHooks,\n", "")
bs = once(bs, 'import { coreAPI } from "./state";', 'import { coreAPI, registerModule } from "./state";\nimport type { CoreModule } from "./types";')
bs = once(bs, "    const { core } = world;\n    const api = coreAPI(core);\n    const mayor = townSeats(api).find(", "    const { core } = world;\n    registerModule(core, HOOK_MODULE);\n    const api = coreAPI(core);\n    const mayor = townSeats(api).find(")

for p, t in ((LEG, leg), (OD, od), (IG, ig), (MT, mt), (TY, ty), (ST, st), (BS, bs)):
    open(p, "w").write(t)
print("moved legislatureHooks, committeeWait, budgetMeeting, meetingAgendaReader and hearingWitnesses onto fields")
