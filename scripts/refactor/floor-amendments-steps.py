#!/usr/bin/env python3
"""
Lawmaking item 6 (LW4), sixth step: `floorAmendmentsRun` in src/core2/modules/legislature.ts
as named steps in the same file. Structure only. The function's state (the bill as amended
so far, the support it has, each member's total and cast vote) was shared by closures, so it
moves into one `AmendmentRun` object the steps read and write; each step is the original
block with those names read off the run.

  python3 scripts/refactor/floor-amendments-steps.py          rewrite the file
  python3 scripts/refactor/floor-amendments-steps.py --check  exit 1 if not yet split

Re-runnable: it does nothing when the steps are already there.
"""
import re
import sys

P = "src/core2/modules/legislature.ts"
s = open(P).read()
if "interface AmendmentRun" in s:
    print("already split")
    sys.exit(0)
if "--check" in sys.argv:
    print("not split")
    sys.exit(1)

start = s.index("function floorAmendmentsRun(\n")
end = s.index("\n}\n", start) + 3
orig = s[start:end]


def cut(text, a, b):
    i = text.index(a)
    j = text.index(b, i)
    return text[i:j]


def dedent(text, n=2):
    return "\n".join(l[n:] if l.startswith(" " * n) else l for l in text.split("\n"))


# names that were closure variables become fields of the run; only the code part
# of a line is rewritten (never a comment, never a quoted word such as "yes")
NAMES = ["current", "yes", "totals", "cast", "roll", "need", "playerId"]
PAT = {n: re.compile(r'(?<![\w."\'])' + n + r'(?![\w"\'])') for n in NAMES}


def on_run(text):
    out = []
    for line in text.split("\n"):
        code, sep, comment = line.partition("//")
        for n, pat in PAT.items():
            code = re.sub(r"\.\.\." + n + r"(?![\w\"'])", "...run." + n, code)
            code = pat.sub("run." + n, code)
        code = code.replace("backs(", "amendmentBacks(run, ")
        code = code.replace("adopt(", "adoptSection(run, ")
        code = code.replace("recount()", "recountSupport(run)")
        out.append(code + sep + comment)
    return "\n".join(out)


ADOPT = cut(orig, "  const adopt = (", "  // A trade: the sponsor")
TRADE = cut(orig, "  // A trade: the sponsor", "  // A poison pill, from the member")
PILL = cut(orig, "  // A poison pill, from the member", "  if (current !== start)")
adopt_body = ADOPT[ADOPT.index(") => {\n") + len(") => {\n"):].rstrip()
assert adopt_body.endswith("};")
adopt_body = dedent(adopt_body[:-2].rstrip("\n"))

def destr(text):
    used = [n for n in ("api", "chamber", "stage") if re.search(r"\b" + n + r"\b", text)]
    return "  const { " + ", ".join(used) + " } = run;\n" if used else ""

steps = (
    '''/** One round of floor amendments on a bill: the bill as amended so far and the support it has. */
interface AmendmentRun {
  api: CoreAPI;
  chamber: string;
  stage: "committee" | "floor";
  playerId: string | null | undefined;
  /** The members who may be dealt with (everyone seated but the player). */
  roll: string[];
  /** The yes votes the bill needs. */
  need: number;
  current: BillRow;
  yes: number;
  totals: Map<string, number>;
  /** A vote already cast is that member's vote: their own choice, a promise kept, or a decision made for them. */
  cast: Map<string, "yes" | "no" | "abstain">;
}

/** Whether a member backs the bill: by the vote they cast, else by their total. */
function amendmentBacks(run: AmendmentRun, k: string, total: number): boolean {
  return run.cast.has(k) ? run.cast.get(k) === "yes" : total > 0;
}

/** Each member's total on the bill as it stands, and how many back it. */
function recountSupport(run: AmendmentRun): number {
  for (const k of run.roll)
    run.totals.set(k, positionOn(run.api, run.current, k).total);
  return run.roll.filter((k) => amendmentBacks(run, k, run.totals.get(k)!))
    .length;
}

/** A section added to the bill, with both sides' reasons and the public record of the amendment. */
function adoptSection(
  run: AmendmentRun,
  section: Provision,
  memberId: string,
  kind: "trade-amendment" | "poison-pill",
): void {
'''
    + destr(on_run(adopt_body).replace("run.api", "api"))
    + on_run(adopt_body).replace("run.api", "api")
    + '''
}

/** A trade: the sponsor (the player deals for themselves) gives a holdout their own section for their vote. */
function tradeAmendments(run: AmendmentRun): void {
'''
    + destr(on_run(dedent(TRADE)).replace("run.api", "api"))
    + on_run(dedent(TRADE)).replace("run.api", "api")
    + '''}

/** A poison pill, from the member most against a bill that would pass. */
function poisonPill(run: AmendmentRun): void {
'''
    + destr(on_run(dedent(PILL)).replace("run.api", "api"))
    + on_run(dedent(PILL)).replace("run.api", "api")
    + '''}

'''
)
HEAD = cut(orig, "function floorAmendmentsRun(", "  let current = start;")
CAST = cut(orig, "  // A vote already cast is that member's vote", "  const backs = ")
CAST = CAST.replace('  const cast = new Map<string, "yes" | "no" | "abstain">();\n', "", 1)
assert "new Map" not in CAST
new_fn = (
    HEAD
    + """  const run: AmendmentRun = {
    api,
    chamber,
    stage,
    playerId,
    roll,
    need,
    current: start,
    yes: 0,
    totals: new Map<string, number>(),
    cast: new Map<string, "yes" | "no" | "abstain">(),
  };
"""
    + on_run(CAST).replace("run.api", "api")
    + """  run.yes = recountSupport(run);
  tradeAmendments(run);
  poisonPill(run);
  if (run.current !== start)
    table(api, "bills").put(run.current as unknown as ModuleRow);
  return run.current;
}
"""
)
s = s[:start] + steps + new_fn + s[end:]
open(P, "w").write(s)
print("split floorAmendmentsRun into amendmentBacks, recountSupport, adoptSection, tradeAmendments, poisonPill")
