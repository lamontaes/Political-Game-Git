---
id: world-unemployment-work-search
title: "Unemployment claims check work-search contacts per week"
area: world
kind: feature
priority: 3
size: S
status: claimed
claimed-by: claude/political-game-pool-yucp92-ad
pr:
blocked-on: owner-unemployment-work-search
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:42:04.098Z
---

**What.** State unemployment law carries `workSearchContactsPerWeek` (starting-law.json) but nothing reads it. Add it to the unemployment terms in jobs-benefits.ts and have `payClaims` pay a week only when the claimant's search that week meets it.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place with a work-search rule, a claimant who made too few contacts is paid nothing that week, shown by claim and week record ids.

**Files.** src/core2/jobs-benefits.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Looked at Oct 16 (claude/unemployment-work-search), not built. Two things stop it. A seeker's "contacts" today are the openings in their own place they apply to in the weekly matching (`runWeek` in jobs.ts); in a town with few or no openings (the Anon Raices, Puerto Rico year had none open at the end) every claimant would fall short of 1 to 3 contacts a week through no choice of their own and lose the week, because the game has no out-of-town openings to apply to. And the rule is a real-world step (log your contacts) the golden path does not need and The Political Process baseline does not list, which AGENTS.md "a game, not a spreadsheet" sends to the owner as a question rather than a feature. If he wants it: size contacts from the seeker's drive and the labor market the regional engine already reads, pay on a sliding scale of contacts against the requirement (nothing flips at a threshold), and read the requirement from the state's law row. If not: delete `workSearchContactsPerWeek` from `starting-law.json`, since nothing reads it.

Checked Oct 17 (claude, nothing built): the model records no job-search contacts for a claimant. Seekers apply to openings through the shared chooser in jobs.ts, but nothing counts contacts per week, and payClaims has no week of search to test. Building the check means inventing a contact count per person, which is a form-filling step the player's life does not have. AGENTS.md "This is a game, not a spreadsheet" says to put a real-world step the game lacks to the owner rather than build it, unless the golden path, The Political Process or the owner's name requires it. Question for the owner, for the PR body of whoever builds it: should a claimant's benefit depend on how many openings they applied to that week (read from the applications the seekers already make), or should the work-search law stay a recorded rule with no player-facing step?

Looked at again Oct 17 (claude, nothing built), following the rule that an owner question is flagged and the simplest version built. The simplest version counts a claimant's contacts as the openings they applied to in the week (the weekly pass in jobs.ts that fills `applications`). It would cut off benefits for almost everyone, because a played year ends with no position standing open in any place measured (the findings on world-hires-below-jolts), so a claimant has nothing to apply to; a real search contact is an inquiry to an employer whether or not a position is posted. The check cannot be built honestly until the model has searching that is not tied to an open position. Depends on the hiring items (world-hires-below-jolts, world-customers-move-between-sellers).
