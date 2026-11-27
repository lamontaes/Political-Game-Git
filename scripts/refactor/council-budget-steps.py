#!/usr/bin/env python3
"""
Lawmaking item 6 (LW4), first step: councilBudget in src/core2/modules/legislature.ts
as named steps in the same file. Structure only: each step is the original code
moved into a function whose parameters are the variables it closed over.

  python3 scripts/refactor/council-budget-steps.py          rewrite the file
  python3 scripts/refactor/council-budget-steps.py --check  exit 1 if not yet split

Re-runnable: it does nothing when the steps are already there.
"""
import sys

P = "src/core2/modules/legislature.ts"
s = open(P).read()
if "function budgetBillFor(" in s:
    print("already split")
    sys.exit(0)
if "--check" in sys.argv:
    print("not split")
    sys.exit(1)

start = s.index("function councilBudget(\n")
end = s.index("\n}\n", start) + 3
orig = s[start:end]


def cut(text, a, b):
    i = text.index(a)
    j = text.index(b, i)
    return text[i:j]


def dedent(text, n=2):
    return "\n".join(l[n:] if l.startswith(" " * n) else l for l in text.split("\n"))


head = cut(orig, "function councilBudget(", "  // The bill the hearing was held on")
chambers_check = head[head.index("  const chambers"):]
bill_block = cut(orig, "  // The bill the hearing was held on", "  // Each member's duty")
player_block = cut(orig, "  const player =", "  const roll = ")
roll_block = cut(orig, "  const roll = ", "  // A rejected budget is negotiated")
negotiation = cut(orig, "  // A rejected budget is negotiated", '  for (const row of result.rows) table(api, "votes").put(row);')
tail = orig[orig.index('  for (const row of result.rows) table(api, "votes").put(row);'):]

# the roll closure's body (between "{" and the closing "};")
roll_body = roll_block[roll_block.index("=> {\n") + len("=> {\n"):].rstrip()
assert roll_body.endswith("};")
roll_body = dedent(roll_body[:-2].rstrip("\n"))
roll_body = roll_body.replace(
    """  const tallies: {
    chamber: string;
    title: string;
    yes: number;
    no: number;
  }[] = [];""",
    '  const tallies: BudgetRoll["tallies"] = [];',
)

bill_inner = bill_block.replace("  // No section to vote on: the budget carries by rule, no bill is filed.\n", "  // No section to vote on: the budget carries by rule, no bill is filed.\n")
bill_inner = bill_inner.replace(
    "  const bill =\n    heardBill ??\n    draftBill(api, {\n      bodyOfficeId: chambers.introducedIn,\n      sponsorId: sections!.sponsor,\n      provisions,\n    });\n",
    "  const bill =\n    heardBill ??\n    draftBill(api, {\n      bodyOfficeId: chambers.introducedIn,\n      sponsorId: sections!.sponsor,\n      provisions,\n    });\n  return { bill, provisions };\n",
)
assert "return { bill, provisions };" in bill_inner

negotiation_inner = negotiation + "  return { kept, result, halved, dropped };\n"

new = (
    '''/** The chambers that vote a government's budget: what `budgetChambers` returns when it finds them. */
type BudgetChambers = NonNullable<ReturnType<typeof budgetChambers>>;

/**
 * The bill a council's budget vote is held on, with its provisions, or null
 * where no section is left to vote on (last year's budget carries by rule).
 */
function budgetBillFor(
  api: CoreAPI,
  gov: GovernmentRow,
  fy: number,
  chambers: BudgetChambers,
): { bill: BillRow; provisions: Provision[] } | null {
'''
    + bill_inner.replace("  if (!provisions.length) return null;\n", "  if (!provisions.length) return null;\n", 1)
    + '''}

/** One voting round on a budget bill's kept changes: each chamber's tally, the member vote rows and the members against. */
interface BudgetRoll {
  adopted: boolean;
  tallies: { chamber: string; title: string; yes: number; no: number }[];
  rows: ModuleRow[];
  against: string[];
}

/**
 * One round of the budget vote. Each member's duty to adopt a budget sits
 * beside their views on its changes; every chamber must pass it (the U.S.
 * Senate by cloture first).
 */
function budgetRoll(
  api: CoreAPI,
  bill: BillRow,
  chambers: BudgetChambers,
  kept: readonly Provision[],
  player: string | null | undefined,
): BudgetRoll {
'''
    + roll_body
    + '''
}

/** Vote the budget, and negotiate it with its opponents until it passes or no change is left. */
function negotiateBudget(
  api: CoreAPI,
  bill: BillRow,
  chambers: BudgetChambers,
  provisions: readonly Provision[],
  player: string | null | undefined,
): {
  kept: readonly Provision[];
  result: BudgetRoll;
  halved: Map<string, number>;
  dropped: string[];
} {
  const roll = (kept: readonly Provision[]) =>
    budgetRoll(api, bill, chambers, kept, player);
'''
    + negotiation_inner
    + '''}

'''
    + head
    + '''  const filed = budgetBillFor(api, gov, fy, chambers);
  if (!filed) return null;
  const { bill, provisions } = filed;
'''
    + player_block
    + '''  const { kept, result, halved, dropped } = negotiateBudget(
    api,
    bill,
    chambers,
    provisions,
    player,
  );
'''
    + tail
)
s = s[:start] + new + s[end:]
open(P, "w").write(s)
print("split councilBudget into budgetBillFor, budgetRoll, negotiateBudget")
