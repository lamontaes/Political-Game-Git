#!/usr/bin/env python3
"""
Lawmaking item 6 (LW4), third step: `countVote` in src/core2/modules/legislature.ts
as named steps in the same file. Structure only: each step is the original block
moved into a function; where a block returned the bill early, the step returns
{ ended } and `countVote` returns it.

  python3 scripts/refactor/count-vote-steps.py          rewrite the file
  python3 scripts/refactor/count-vote-steps.py --check  exit 1 if not yet split

Re-runnable: it does nothing when the steps are already there.
"""
import re
import sys

P = "src/core2/modules/legislature.ts"
s = open(P).read()
if "function readyForFloor(" in s:
    print("already split")
    sys.exit(0)
if "--check" in sys.argv:
    print("not split")
    sys.exit(1)

start = s.index("function countVote(api: CoreAPI, billId: string, anyDay: boolean): BillRow {\n")
end = s.index("\n}\n", start) + 3
orig = s[start:end]


def cut(text, a, b):
    i = text.index(a)
    j = text.index(b, i)
    return text[i:j]


A = cut(orig, '  let bill = table(api, "bills").get(billId)', "  const chambers = chambersOf(api, bill);")
B = cut(orig, "  const committee = committeeStage(", "  recordPromises(api, bill, chamber);")
C = cut(orig, "  // A tie: the presiding officer", "  // The roll is closed:")

# A: its `return bill;` lines end the vote early
A_body = A.replace("return bill;", "return { ended: bill };")
assert "return { ended: bill };" in A_body
# B: `return held;` ends it early
B_body = B.replace("return held;", "return { ended: held };")
assert "return { ended: held };" in B_body
# bill is reassigned in A and B, so they declare it
A_fn = (
    '''/**
 * A bill that may be voted on the floor today: ended (returned as it stands)
 * where it is not drafted, waits on the next chamber's own sitting, or is
 * blocked by its text; else the bill with its text checked and the
 * before-the-vote hooks run.
 */
function readyForFloor(
  api: CoreAPI,
  billId: string,
  anyDay: boolean,
): { ended: BillRow } | { bill: BillRow } {
'''
    + A_body
    + "  return { bill };\n}\n\n"
)
B_fn = (
    '''/**
 * The committee's stage before the floor: ended (the bill as the committee left
 * it) where it did not report the bill out; else the bill as its markup left it,
 * citing the report that sent it to the floor.
 */
function reportFromCommittee(
  api: CoreAPI,
  billInput: BillRow,
  chamber: string,
): { ended: BillRow } | { bill: BillRow } {
  let bill = billInput;
'''
    + B_body
    + "  return { bill };\n}\n\n"
)
C_fn = (
    '''/**
 * The floor's tally after a count: a tie goes to the presiding officer who may
 * break one, and the U.S. Senate first needs three fifths of its sworn members
 * to end debate.
 */
function floorTally(
  api: CoreAPI,
  bill: BillRow,
  chamber: string,
  counted: { yes: number; no: number },
): { tally: { yes: number; no: number }; cloture: boolean } {
'''
    + C
    + "  return { tally, cloture };\n}\n\n"
)
# the cloture comment sits inside C already; countVote now reads them
new_count = orig
new_count = new_count.replace(A, '''  const ready = readyForFloor(api, billId, anyDay);
  if ("ended" in ready) return ready.ended;
  let bill = ready.bill;
''', 1)
new_count = new_count.replace(B, '''  const reported = reportFromCommittee(api, bill, chamber);
  if ("ended" in reported) return reported.ended;
  bill = reported.bill;
''', 1)
new_count = new_count.replace(C, '''  const { tally, cloture } = floorTally(api, bill, chamber, counted);
''', 1)
s = s[:start] + A_fn + B_fn + C_fn + new_count + s[end:]
open(P, "w").write(s)
print("split countVote into readyForFloor, reportFromCommittee, floorTally")
