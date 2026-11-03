---
id: laws-work-requirement-bill-missing-washington-dc
title: "The health and schools test finds no bill priced by the Medicaid work requirement in Washington, D.C."
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
lead: laws
blocked-on:
source: added by hand on claude/laws-medical-debt (the lead's builders do not push to main)
---

**What.** src/core2/law-wiring-health-schools.test.ts fails on claude/laws-medical-debt in Washington, District of Columbia (place 1150000, world seed 8fdeb9c810da431dc732125ca831a2eb26d83964c837f651b04fcbf24b8463bf; pin it with GOLDEN_PATH_PLACE_KEY=1150000 GOLDEN_PATH_WORLD_SEED=8fdeb9c810da431dc732125ca831a2eb26d83964c837f651b04fcbf24b8463bf): "us-policy-positions:health-human-services.medicaid-work-requirement: no applied record". The requirement reached adults (the town passed the opening check), but no medical bill after the day it took effect has a member whose coverage it ended, priced at their own plan's share (requirementMinor above zero) and paid by journal entry, so the test finds no applied row to tie the requirement's money to. It fails the same way with the Nov 1 coverage change (Medicaid is no employer plan, ffe7741278) taken out, so that change is not the cause.

**Rules.** No dice; one rule for all 56 places. Read the records first: the requirement's ended coverage stretches (medicaidCoverageSpells with ENDED_BY_REQUIREMENT), the bills of the households of the people it ended, and whether those households paid anything that month.

**Done when.** The pinned D.C. world passes law-wiring-health-schools.test.ts, or the PR names by record why no bill there is priced by the requirement and the test's opening check redraws such a town before it plays.

**Files.** src/core2/law-wiring-health-schools.test.ts, src/core2/medical-bills.ts, src/core2/law-reach/group-b-money.ts

**Notes.** Found Nov 1 by the laws lead's builder on claude/laws-medical-debt while rerunning the touched health and schools test (GOLDEN_PATH_SEED unset; Woodstock, New York was redrawn first for its teacher minimum).
