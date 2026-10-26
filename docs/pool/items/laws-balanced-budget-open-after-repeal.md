---
id: laws-balanced-budget-open-after-repeal
title: "Taxes family test fails on main in Wassaic, New York: the balanced operating budget rule keeps a record open after its repeal"
area: laws
lead: laws
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/balanced-budget-repeal
pr: #6171
blocked-on:
source: laws lead, Oct 26
claimed-at: 2026-10-26T18:14:29.118Z
---

**What.** `src/core2/law-wiring-taxes.test.ts` fails on clean main at 56ecd3508e with `GOLDEN_PATH_SEED=e605d71b551e5dd49cb8`, which draws Wassaic, New York (3678476): "us-policy-positions:fiscal.balanced-operating-budget open after repeal: expected 1 to be +0". One applied record of the balanced operating budget rule stays open a month after the test repeals the rule. The rule is reviewed by the treasury's monthly close (`reviewFiscalRules` in `src/core2/law-reach/group-b.ts`); whether the close stops reviewing a repealed rule before it ends that rule's records, or the record belongs to another level's row, is not traced. Found on the health and schools branch's gate (PR #6026), where it fails the same way.

**Rules.** An effect is a read, not a record: a repealed rule's records end when the engine that reads it stops applying it. Never weaken the repeal check. One rule, all 56 places.

**Done when.** The taxes family test passes on `GOLDEN_PATH_SEED=e605d71b551e5dd49cb8` (Wassaic, New York) and on a fresh seed named in the PR, every fiscal rule's records end within a month of its repeal, and the test still fails when the repeal path is switched off. **On screen.** None by design: this is a check on the law engine; the player notices only that a repealed rule stops acting.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/law-wiring-taxes.test.ts

**Notes.** Filed by the laws lead, Oct 26.
