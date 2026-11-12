---
id: laws-work-requirement-bill-missing-washington-dc
title: "The health and schools test finds no bill priced by the Medicaid work requirement in Washington, D.C."
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
lead: laws
blocked-on:
source: added by hand on claude/laws-medical-debt (the lead's builders do not push to main)
after:
model: haiku
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** src/core2/law-wiring-health-schools.test.ts fails on claude/laws-medical-debt in Washington, District of Columbia (place 1150000, world seed 8fdeb9c810da431dc732125ca831a2eb26d83964c837f651b04fcbf24b8463bf; pin it with GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=8fdeb9c810da431dc732125ca831a2eb26d83964c837f651b04fcbf24b8463bf): "us-policy-positions:health-human-services.medicaid-work-requirement: no applied record". The requirement reached adults (the town passed the opening check), but no medical bill after the day it took effect has a member whose coverage it ended, priced at their own plan's share (requirementMinor above zero) and paid by journal entry, so the test finds no applied row to tie the requirement's money to. It fails the same way with the Nov 1 coverage change (Medicaid is no employer plan, ffe7741278) taken out, so that change is not the cause. Guards: the Medicaid work requirement bill the player drafts is priced on its bill card in every place, D.C. included.

**Cause.** Measured: it does not reproduce on main. `GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=8fdeb9c810da431dc732125ca831a2eb26d83964c837f651b04fcbf24b8463bf npx vitest run src/core2/law-wiring-health-schools.test.ts` (Washington, District of Columbia) passes on main d59e6935d7, 1 of 1, so the Medicaid work requirement there has its applied record. The failure was seen on the branch `claude/laws-medical-debt`, not on main.

**Fix.** Nothing to build. Proposed: the CTO closes the item (`npm run pool -- status laws-work-requirement-bill-missing-washington-dc done --by=cto`).

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the item.

**Rules.** No dice; one rule for all 56 places. Read the records first: the requirement's ended coverage stretches (medicaidCoverageSpells with ENDED_BY_REQUIREMENT), the bills of the households of the people it ended, and whether those households paid anything that month.

**Done when.** The CTO closes the item. If it is kept, a second session runs the test on the D.C. pin above and one fresh drawn place (named with its seed) on main and sees it pass, with the work requirement's applied record named by id.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-health-schools.test.ts, src/core2/medical-bills.ts, src/core2/law-reach/group-b-money.ts

**Notes.** Found Nov 1 by the laws lead's builder on claude/laws-medical-debt while rerunning the touched health and schools test (GOLDEN_PATH_SEED unset; Woodstock, New York was redrawn first for its teacher minimum).

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=8fdeb9c8...63bf npx vitest run src/core2/law-wiring-health-schools.test.ts` (Washington, D.C.): green, exit 0. Fresh draw `GOLDEN_PATH_SEED=b70d0be4c7e7ca61`: green. Proposed for the CTO: drop as fixed on main.

Nov 11 (cause finder for Fable B): the pinned D.C. repro passes on main d59e6935d7. The failure belonged to an unmerged branch. I propose the CTO closes the item.
