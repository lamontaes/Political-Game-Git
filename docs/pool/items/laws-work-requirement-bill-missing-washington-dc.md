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
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** src/core2/law-wiring-health-schools.test.ts fails on claude/laws-medical-debt in Washington, District of Columbia (place 1150000, world seed 8fdeb9c810da431dc732125ca831a2eb26d83964c837f651b04fcbf24b8463bf; pin it with GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=8fdeb9c810da431dc732125ca831a2eb26d83964c837f651b04fcbf24b8463bf): "us-policy-positions:health-human-services.medicaid-work-requirement: no applied record". The requirement reached adults (the town passed the opening check), but no medical bill after the day it took effect has a member whose coverage it ended, priced at their own plan's share (requirementMinor above zero) and paid by journal entry, so the test finds no applied row to tie the requirement's money to. It fails the same way with the Nov 1 coverage change (Medicaid is no employer plan, ffe7741278) taken out, so that change is not the cause. Guards: the Medicaid work requirement bill the player drafts is priced on its bill card in every place, D.C. included.

**Cause.** Needs cause. Looked at the item: the repro is GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=8fdeb9c810da431dc732125ca831a2eb26d83964c837f651b04fcbf24b8463bf on src/core2/law-wiring-health-schools.test.ts, but why no medical bill is priced by the requirement (no bill after the day it took effect has a member whose coverage it ended) is unread.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. The session reads the ended coverage stretches and the bills of those households and rewrites this item with Found in code or Measured and a real Fix.

**Rules.** No dice; one rule for all 56 places. Read the records first: the requirement's ended coverage stretches (medicaidCoverageSpells with ENDED_BY_REQUIREMENT), the bills of the households of the people it ended, and whether those households paid anything that month.

**Done when.** A second session, not the fixer, runs the test on the pinned drawn place. The pinned D.C. world passes law-wiring-health-schools.test.ts, or the PR names by record why no bill there is priced by the requirement and the test's opening check redraws such a town before it plays.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-health-schools.test.ts, src/core2/medical-bills.ts, src/core2/law-reach/group-b-money.ts

**Notes.** Found Nov 1 by the laws lead's builder on claude/laws-medical-debt while rerunning the touched health and schools test (GOLDEN_PATH_SEED unset; Woodstock, New York was redrawn first for its teacher minimum).

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=8fdeb9c8...63bf npx vitest run src/core2/law-wiring-health-schools.test.ts` (Washington, D.C.): green, exit 0. Fresh draw `GOLDEN_PATH_SEED=b70d0be4c7e7ca61`: green. Proposed for the CTO: drop as fixed on main.
