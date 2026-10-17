---
id: laws-family-bargaining
title: "Collective bargaining and agency fees (right to work)"
area: laws
kind: wiring
priority: 3
size: L
status: done
claimed-by:
pr: #4446
blocked-on:
milestone:
source: "split of laws-remaining-families (Oct 15)"
claimed-at:
---

**What.** SG-GOV-REACH-A-bargaining and SG-GOV-REACH-A-union-dues: union membership on jobs, dues as a payroll deduction, public-sector bargaining that sets unit pay. The owner set unions and strikes for 1.0 (OWNER-DECISIONS.md, Oct 14), so this waits for a bargaining engine that does not exist.

**Rules.** An effect is a read; no dice; one rule, all 56 places.

**Done when.** Split into bounded items by the session that claims it.

**Files.** New engine; src/core2/law-reach/group-a*.ts.

**Notes.** Owner: unions and strikes are 1.0.

Session handed off Oct 15, 2026: PR #4446 (claude/laws-family-bargaining-v2) holds the right-to-work half only; remainder: the other half of the item (see PR body).

Sent back 2026-10-16 from PR #4446 (branch claude/laws-family-bargaining-v2): merging main conflicts in docs/pool/items/laws-family-bargaining.md (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4446 (branch claude/laws-family-bargaining-v2): src/core2/right-to-work-law.test.ts fails on this branch merged with current main: seed a2cb700c4fb093c13addba920175a4bb040cd4609d630775fed2300d5945944b, place 2225545, 'expected 1 to be +0' in 'lowers union dues as membership falls after the law, and raises them back on repeal'. Reproduce with that seed and fix the root cause, then re-run the test on a fresh random place; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4446 (branch claude/laws-family-bargaining-v2): Sent back by the merger: src/core2/right-to-work-law.test.ts fails on this branch merged with current main: seed a2cb700c4fb093c13addba920175a4bb040cd4609d630775fed2300d5945944b, place 2225545, 'expected 1 to be +0' in 'lowers union dues as membership falls after the law, and raises them back on repeal'. Reproduce with that seed and fix the root cause, then re-run the test on a fresh random place Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.
