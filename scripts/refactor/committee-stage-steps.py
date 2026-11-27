#!/usr/bin/env python3
"""
Lawmaking item 6 (LW4), fourth step: `committeeStage` in src/core2/modules/legislature.ts
as named steps in the same file. Structure only: each step is the original block moved
into a function whose parameters are the variables it used.

  python3 scripts/refactor/committee-stage-steps.py          rewrite the file
  python3 scripts/refactor/committee-stage-steps.py --check  exit 1 if not yet split

Re-runnable: it does nothing when the steps are already there.
"""
import sys

P = "src/core2/modules/legislature.ts"
s = open(P).read()
if "function wageWitnesses(" in s:
    print("already split")
    sys.exit(0)
if "--check" in sys.argv:
    print("not split")
    sys.exit(1)

start = s.index("function committeeStage(\n")
end = s.index("\n}\n", start) + 3
orig = s[start:end]


def cut(text, a, b):
    i = text.index(a)
    j = text.index(b, i)
    return text[i:j]


W = cut(orig, "  const witnesses: HearingWitness[] = [];\n", "  // Each witness makes their case to the committee's members who are people\n")
Pw = cut(orig, "  // A bill that is not a wage bill is heard on its own question", "  if (heard && question && api.state.modules.has(SPEECH_MODULE_ID)) {\n")
Sp = cut(orig, "  if (heard && question && api.state.modules.has(SPEECH_MODULE_ID)) {\n", "  // Markup: the committee's holdouts")
V = cut(orig, "  const votes: CommitteeRecord[\"votes\"][number][] = [];\n", "  const yes = votes.filter")
E = cut(orig, "  api.emit({\n    // A hearing the chair set", "  return record;\n")

new_steps = (
    '''/** What a committee hears on a bill: the question the bill asks, as the stance of its first section that has one. */
type HearingQuestion = NonNullable<ReturnType<typeof provisionStance>>;

/** The seated members of a chamber's committee on a bill. */
type CommitteeRoster = NonNullable<ReturnType<typeof committeeSeats>>["roster"];

/** The workers a wage bill's hearing hears: those paid under the proposed floor, lowest pay first. */
function wageWitnesses(
  api: CoreAPI,
  bill: BillRow,
  heard: boolean,
): HearingWitness[] {
'''
    + W
    + '''  return witnesses;
}

/** The people the interest groups' records show taking a side on the question, added up to the hearing's size. */
function addInterestWitnesses(
  api: CoreAPI,
  bill: BillRow,
  witnesses: HearingWitness[],
  heard: boolean,
  question: HearingQuestion | undefined,
): void {
'''
    + Pw
    + '''}

/** Each witness makes their case to the committee's members who are people. */
function deliverHearingSpeeches(
  api: CoreAPI,
  bill: BillRow,
  chamber: string,
  roster: CommitteeRoster,
  witnesses: readonly HearingWitness[],
  heard: boolean,
  question: HearingQuestion | undefined,
): void {
'''
    + Sp
    + '''}

/** The committee's members' votes on where they stand after the hearing. */
function committeeVotes(
  api: CoreAPI,
  bill: BillRow,
  roster: CommitteeRoster,
  heard: boolean,
): CommitteeRecord["votes"][number][] {
'''
    + V
    + '''  return votes;
}

/** The committee's hearing (or the bill's being held) as a public record. */
function recordCommittee(
  api: CoreAPI,
  bill: BillRow,
  chamber: string,
  record: CommitteeRecord,
  agreed: unknown,
  question: HearingQuestion | undefined,
): void {
  const { heard, yes, no, witnesses } = record;
'''
    + E
    + '''}

'''
)

new_orig = orig
new_orig = new_orig.replace(W, "  const witnesses = wageWitnesses(api, bill, heard);\n", 1)
new_orig = new_orig.replace(Pw, "  addInterestWitnesses(api, bill, witnesses, heard, question);\n", 1)
new_orig = new_orig.replace(Sp, "  deliverHearingSpeeches(\n    api,\n    bill,\n    chamber,\n    roster,\n    witnesses,\n    heard,\n    question,\n  );\n", 1)
new_orig = new_orig.replace(V, "  const votes = committeeVotes(api, bill, roster, heard);\n", 1)
new_orig = new_orig.replace(E, "  recordCommittee(api, bill, chamber, record, agreed, question);\n", 1)
s = s[:start] + new_steps + new_orig + s[end:]
open(P, "w").write(s)
print("split committeeStage into wageWitnesses, addInterestWitnesses, deliverHearingSpeeches, committeeVotes, recordCommittee")
