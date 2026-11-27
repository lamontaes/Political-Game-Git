#!/usr/bin/env python3
"""
Lawmaking item 6 (LW4), second step: `enact` in src/core2/modules/legislature.ts
as named steps in the same file. Structure only: each step is the original block
moved into a function whose parameters are the variables it used.

  python3 scripts/refactor/enact-steps.py          rewrite the file
  python3 scripts/refactor/enact-steps.py --check  exit 1 if not yet split

Re-runnable: it does nothing when the steps are already there.
"""
import sys

P = "src/core2/modules/legislature.ts"
s = open(P).read()
if "function repealSeriesStep(" in s:
    print("already split")
    sys.exit(0)
if "--check" in sys.argv:
    print("not split")
    sys.exit(1)

start = s.index("function enact(\n")
end = s.index("\n}\n", start) + 3
orig = s[start:end]


def block(text, opener):
    """The text from `opener` through its closing brace at the opener's indent."""
    i = text.index(opener)
    indent = len(opener) - len(opener.lstrip(" "))
    close = "\n" + " " * indent + "}\n"
    j = text.index(close, i) + len(close)
    return text[i:j]


def dedent(text, n=2):
    return "\n".join(l[n:] if l.startswith(" " * n) else l for l in text.split("\n"))


repeal = block(orig, '    if (\n      provision.kind === "law-amount" &&\n      provision.series &&\n      provision.repeal\n    ) {\n')
amount = block(orig, '    if (provision.kind === "law-amount" && provision.series) {\n')
budget = block(orig, '    if (provision.kind === "budget-line" && provision.line) {\n')
question = block(orig, '    if (provision.kind === "policy-question" && provision.question) {\n')


def body(text):
    """The statements inside an `if (...) { ... }` block, one level out."""
    i = text.index("{\n") + 2
    j = text.rindex("\n    }")
    return dedent(text[i:j] + "\n", 4).rstrip("\n")


repeal_body = body(repeal).replace("\n  continue;", "")
assert "continue" not in repeal_body, repeal_body
amount_body = body(amount)
budget_body = body(budget)
question_body = body(question)
question_body = question_body.replace(
    "    repeats.push({ question: provision.question, ...settled });\n    continue;",
    "    return { question: provision.question, ...settled };",
)
assert "continue" not in question_body and "return { question" in question_body

CTX = "  const { api, bill, jurisdiction, level, citation, estimate, terms } = ctx;\n"

new_steps = (
    '''/** What the steps of `enact` share: the bill, the body it passed in, how its rows are cited and the terms its act records. */
interface EnactContext {
  api: CoreAPI;
  bill: BillRow;
  jurisdiction: string;
  level: ReturnType<typeof effectiveRule>["level"];
  citation: string;
  estimate: boolean;
  terms: Record<string, unknown> | undefined;
}

/** A section that repeals a law series: the repeal takes effect on the section's date. */
function repealSeriesStep(
  ctx: EnactContext,
  provision: Provision & { series: string },
  effectiveDate: string,
): void {
''' + CTX.replace("api, bill, jurisdiction, level, citation, estimate, terms", "api, bill, jurisdiction, level, citation, terms") + repeal_body + '''
}

/** A section that sets a law's amount: the bill sets the amount, never the unit. */
function enactAmountStep(
  ctx: EnactContext,
  provision: Provision & { series: string },
  effectiveDate: string,
): void {
''' + CTX + amount_body + '''
}

/** A section that changes a budget line: the line is amended the day the bill becomes law. */
function enactBudgetLineStep(
  ctx: EnactContext,
  provision: Provision & { line: string },
  enactedValue: number,
): void {
  const { bill, jurisdiction } = ctx;
  const { api } = ctx;
''' + budget_body + '''
}

/**
 * A section that answers a policy question: the repeat it records where it only
 * restates what is already law at this level, else null after writing the law.
 */
function enactQuestionStep(
  ctx: EnactContext,
  provision: Provision & { question: string },
  effectiveDate: string,
): NonNullable<BillRow["repeats"]>[number] | null {
''' + CTX + question_body + '''
  return null;
}

'''
)

new_loop_calls = {
    repeal: '''    if (
      provision.kind === "law-amount" &&
      provision.series &&
      provision.repeal
    ) {
      repealSeriesStep(
        ctx,
        provision as Provision & { series: string },
        effectiveDate,
      );
      continue;
    }
''',
    amount: '''    if (provision.kind === "law-amount" && provision.series)
      enactAmountStep(
        ctx,
        provision as Provision & { series: string },
        effectiveDate,
      );
''',
    budget: '''    if (provision.kind === "budget-line" && provision.line)
      enactBudgetLineStep(
        ctx,
        provision as Provision & { line: string },
        enactedValue,
      );
''',
    question: '''    if (provision.kind === "policy-question" && provision.question) {
      const repeat = enactQuestionStep(
        ctx,
        provision as Provision & { question: string },
        effectiveDate,
      );
      if (repeat) repeats.push(repeat);
    }
''',
}
new_orig = orig
for old, new in new_loop_calls.items():
    new_orig = new_orig.replace(old, new, 1)
# the shared context, built once before the loop
marker = "  const repeats: NonNullable<BillRow[\"repeats\"]>[number][] = [];\n"
assert marker in new_orig
new_orig = new_orig.replace(
    marker,
    marker + "  const ctx: EnactContext = {\n    api,\n    bill,\n    jurisdiction,\n    level,\n    citation,\n    estimate,\n    terms,\n  };\n",
    1,
)
s = s[:start] + new_steps + new_orig + s[end:]
open(P, "w").write(s)
print("split enact into repealSeriesStep, enactAmountStep, enactBudgetLineStep, enactQuestionStep")
