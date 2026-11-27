#!/usr/bin/env python3
"""
Lawmaking item 6 (LW4), fifth step: `chamberVote` in src/core2/modules/legislature.ts
as named steps in the same file. Structure only: each step is the original block moved
into a function whose parameters are the variables it used.

  python3 scripts/refactor/chamber-vote-steps.py          rewrite the file
  python3 scripts/refactor/chamber-vote-steps.py --check  exit 1 if not yet split

Re-runnable: it does nothing when the steps are already there.
"""
import sys

P = "src/core2/modules/legislature.ts"
s = open(P).read()
if "function memberFloorVote(" in s:
    print("already split")
    sys.exit(0)
if "--check" in sys.argv:
    print("not split")
    sys.exit(1)

start = s.index("function chamberVote(\n")
end = s.index("\n}\n", start) + 3
orig = s[start:end]


def cut(text, a, b):
    i = text.index(a)
    j = text.index(b, i)
    return text[i:j]


def dedent(text, n=2):
    return "\n".join(l[n:] if l.startswith(" " * n) else l for l in text.split("\n"))


V = cut(orig, "    // A member who chose their vote (the player) votes as they chose", '    if (vote === "yes") yes += 1;')
R = cut(orig, "    // A member who is a full person has cast a vote of their own", "    for (const stance of billStances(api, bill)) {")
Sx = cut(orig, "    for (const stance of billStances(api, bill)) {", "  }\n  api.emit({\n    id: `bill-vote:")
E = cut(orig, "  api.emit({\n    id: `bill-vote:", "  return { yes, no, rows };")

# the stance loop pushes onto `rows`; as a step it returns its rows
S_body = Sx.replace("        rows.push({", "        out.push({")
assert "out.push({" in S_body

steps = (
    '''/** How a member votes on a bill: as they chose (the player), else by their position, or absent from the sitting. */
function memberFloorVote(
  api: CoreAPI,
  bill: BillRow,
  officeId: string,
  key: string,
  position: ReturnType<typeof memberPosition>,
  closeness: ReturnType<typeof voteCloseness>,
): "yes" | "no" | "abstain" | "absent" {
'''
    + dedent(V)
    + '''  return vote;
}

/** A member's vote as a record: the journal's and the director's event for a full person, and the votes table's row. */
function recordMemberVote(
  api: CoreAPI,
  bill: BillRow,
  officeId: string,
  key: string,
  vote: "yes" | "no" | "abstain" | "absent",
  position: ReturnType<typeof memberPosition>,
  yoursToSee: boolean,
): void {
'''
    + dedent(R)
    + '''}

/** The stance each yes or no vote takes on each question the bill answers. */
function voteStanceRows(
  api: CoreAPI,
  bill: BillRow,
  officeId: string,
  key: string,
  vote: "yes" | "no" | "abstain" | "absent",
): RollRecordRow[] {
  const out: RollRecordRow[] = [];
'''
    + dedent(S_body)
    + '''  return out;
}

/** The chamber's roll call on a bill, as a public record. */
function recordChamberVote(
  api: CoreAPI,
  bill: BillRow,
  officeId: string,
  yes: number,
  no: number,
): void {
'''
    + E
    + '''}

'''
)

new = orig
new = new.replace(
    V,
    "    const vote = memberFloorVote(api, bill, officeId, key, position, closeness);\n",
    1,
)
new = new.replace(
    R,
    "    recordMemberVote(api, bill, officeId, key, vote, position, yoursToSee);\n",
    1,
)
new = new.replace(Sx, "    rows.push(...voteStanceRows(api, bill, officeId, key, vote));\n", 1)
new = new.replace(E, "  recordChamberVote(api, bill, officeId, yes, no);\n", 1)
s = s[:start] + steps + new + s[end:]
open(P, "w").write(s)
print("split chamberVote into memberFloorVote, recordMemberVote, voteStanceRows, recordChamberVote")
