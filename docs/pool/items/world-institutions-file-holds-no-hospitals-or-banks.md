---
id: world-institutions-file-holds-no-hospitals-or-banks
title: "Towns open with no hospital and no bank employer, so hospital charges and bank jobs have nowhere to stand"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: filed by hand on branch claude/project-thread-xy4wd4 (cluster 13, PR #9308)
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** The world's local institutions record holds no hospital and no bank for a city or county, so a town opens with neither as an employer and a hospital fee bill has no hospital to charge for. In nine probed places no city or county had a hospital by the institutions record. The town jobs engine drops hospital and bank from a town's workplace mix when no source names one, so those workplaces never exist. Seen: on the draft card's Fees and charges list, where hospital charges appear for a town or county only where a hospital stands, and in a town's workplace list, where a hospital and the town's banks appear as employers.

**Cause.** Found in code: `SOURCED_ONLY` in src/core2/opening-town-jobs.ts holds "bank" and "hospital", and `writableTownWeights` and `writeTownEmployer` skip both when `sourcedTownInstitution` finds no row in the institutions file (src/core2/reference/local-institutions.ts, `hospitals: []` by default). The file lists none, so nothing is ever written.

**Fix.** Generate hospitals and banks by a place's size and kind from ESTIMATED or TUNABLE rows with a spread, through the engine that makes the other town employers (route 2, approved); give the credit engine's existing town banks an employer and a name rather than a second bank; delete the fallback shares in `SOURCED_ONLY` in the same change; take names from the game's own naming. Check open PR #8942 (towns hold their county's work) first and build on it.

**Time box.** 6 hours for one opus session.

**Rules.** Day one is in motion: a town opens with the stock its size would have, built by the engine that makes the flow. No dice: a place's size and kind decide, never a roll. One rule for all 56 places. Unattended-world timing at three places, with and without, twice each side. Test places include Wofford Heights, California at seed a9c85de3-e7fa-4418-8499-569a5c5e6e10, showing the mix of workplace kinds before and after.

**Done when.** A second session opens a drawn place and seed and sees a hospital and the town's banks among its employers by size; hospital charges are offered where a hospital stands; a medical bill pays it; and the clinic, care home and insurance agency stop carrying shares that are not theirs.

**Waits on.** PR #9308 folding.

**Files.** src/core2/opening-town-jobs.ts, src/core2/reference/local-institutions.ts, src/core2/bill-catalog.ts

**Notes.** Found while building PR #9308 (fee levels by bill); the Account lead approved route 2 and the Wofford Heights test place.
