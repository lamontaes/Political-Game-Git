#!/usr/bin/env python3
"""
Lawmaking item 7 (LW3), family three: the bribe scope the legislature gives the
corruption engine moves from a list corruption.ts keeps (filled by
registerBribeScope when the legislature opens) onto the CoreModule field
`bribeScope` that the legislature module carries, read with fieldsOf in install
order. registerBribeScope, its list and the BribeScope type go.

  python3 scripts/refactor/bribe-scope-field.py          rewrite the files
  python3 scripts/refactor/bribe-scope-field.py --check  exit 1 if not yet moved

Re-runnable: it does nothing when the field is already carried.
"""
import sys

LEG = "src/core2/modules/legislature.ts"
COR = "src/core2/modules/corruption.ts"
leg = open(LEG).read()
cor = open(COR).read()
if "  bribeScope: billBribeScope," in leg:
    print("already moved")
    sys.exit(0)
if "--check" in sys.argv:
    print("not moved")
    sys.exit(1)


def once(text, old, new):
    assert text.count(old) == 1, (text.count(old), old[:80])
    return text.replace(old, new, 1)


leg = once(leg, "import { bribePull, registerBribeScope } from \"./corruption\";", "import { bribePull } from \"./corruption\";")
leg = once(
    leg,
    "  // Registered when the legislature opens, never as the file loads: in an\n  // import cycle the corruption module's list may not exist yet.\n  registerBribeScope(billBribeScope);\n",
    "",
)
leg = once(
    leg,
    "  budgetVote: (api, gov, fiscalYear) =>",
    "  // Why an official has no say over a bill (corruption asks every carrier).\n  bribeScope: billBribeScope,\n  budgetVote: (api, gov, fiscalYear) =>",
)
cor = once(
    cor,
    """/**
 * Whether the official has a say over what is asked for: a module that knows a kind of subject
 * (the legislature, for a bill) answers with the reason the official has none, or null.
 */
export type BribeScope = (
  api: CoreAPI,
  subjectId: string,
  officialId: string,
) => string | null;
const scopes: BribeScope[] = [];
/** Registered by the module's opening, once however often it opens. */
export function registerBribeScope(scope: BribeScope): void {
  if (!scopes.includes(scope)) scopes.push(scope);
}
""",
    "",
)
cor = once(
    cor,
    "  for (const scope of scopes) {\n    const reason = scope(api, ask.subjectId, ask.officialId);",
    "  // Whether the official has a say over what is asked for: each module that\n  // knows a kind of subject (the legislature, for a bill) carries a `bribeScope`\n  // that answers with the reason the official has none, or null.\n  for (const scope of fieldsOf(api.state as CoreState, \"bribeScope\")) {\n    const reason = scope(api, ask.subjectId, ask.officialId);",
)
cor = once(cor, '} from "../types";\n', '} from "../types";\nimport { fieldsOf } from "../module-fields";\n')
open(LEG, "w").write(leg)
open(COR, "w").write(cor)
print("moved bribeScope onto a field the legislature module carries")
