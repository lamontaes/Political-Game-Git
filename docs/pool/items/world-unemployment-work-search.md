---
id: world-unemployment-work-search
title: "Unemployment claims check work-search contacts per week"
area: world
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr: #5595
blocked-on: owner-unemployment-work-search
source: added with npm run pool -- add
claimed-at:
---

**What.** State unemployment law rows carry workSearchContactsPerWeek in src/core2/data/laws/starting-law.json (1 to 4, or null where none is asked), and nothing reads it. By the owner's Oct 20 ruling the rule is recorded law that claimants follow in the background, with no form or log for the player. Add the requirement to UnemploymentTerms in src/core2/jobs-benefits.ts and copy it onto the ClaimRow with the law id. Each week, size a claimant's contacts from their own search effort (their drive and traits through decisionLean) and the regional labor market that src/core2/modules/regional.ts already reads, not from posted openings, and in payClaims pay the week at the share contacts/required capped at one, so the benefit slides with search and never flips at a threshold. Record the contacts on the claim row so the claim and week can be cited.

**Rules.** No dice: contacts follow the claimant's drive, traits, hours and the regional labor market, so two claimants differ for stated reasons and never by a roll. Sliding scales and causes: the week's payment is the weekly benefit times contacts over the requirement, capped at one, and nothing flips at a threshold. One rule, all 56 places: the requirement is read from the state's law row in force, and a null row asks nothing; no state is named in code. This is a game, not a spreadsheet: the player files no contacts, a jobless player sees only the payment and the English engine's words for it. An effect is a read: payClaims reads the contacts and the household's cash shows the smaller week. One model, two tiers: a counted claimant takes the same rule times its weight.

**Done when.** A test in src/core2/jobs-benefits.test.ts runs a one-year played world (buildBenchWorld, a place drawn from all 56 with a work-search rule, a seed the builder did not choose), shows two laid-off claimants with different drives paid different shares of the same weekly benefit in the same week, by claim id and week date, and shows a place whose law row is null pays in full. The household's cash after the lower payment is read by its next bill, and the journal balances.

**Files.** src/core2/jobs-benefits.ts, src/core2/modules/jobs.ts, src/core2/data/laws/starting-law.json, src/core2/jobs-benefits.test.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Looked at Oct 16 (claude/unemployment-work-search), not built. Two things stop it. A seeker's "contacts" today are the openings in their own place they apply to in the weekly matching (`runWeek` in jobs.ts); in a town with few or no openings (the Anon Raices, Puerto Rico year had none open at the end) every claimant would fall short of 1 to 3 contacts a week through no choice of their own and lose the week, because the game has no out-of-town openings to apply to. And the rule is a real-world step (log your contacts) the golden path does not need and The Political Process baseline does not list, which AGENTS.md "a game, not a spreadsheet" sends to the owner as a question rather than a feature. If he wants it: size contacts from the seeker's drive and the labor market the regional engine already reads, pay on a sliding scale of contacts against the requirement (nothing flips at a threshold), and read the requirement from the state's law row. If not: delete `workSearchContactsPerWeek` from `starting-law.json`, since nothing reads it.

Checked Oct 17 (claude, nothing built): the model records no job-search contacts for a claimant. Seekers apply to openings through the shared chooser in jobs.ts, but nothing counts contacts per week, and payClaims has no week of search to test. Building the check means inventing a contact count per person, which is a form-filling step the player's life does not have. AGENTS.md "This is a game, not a spreadsheet" says to put a real-world step the game lacks to the owner rather than build it, unless the golden path, The Political Process or the owner's name requires it. Question for the owner, for the PR body of whoever builds it: should a claimant's benefit depend on how many openings they applied to that week (read from the applications the seekers already make), or should the work-search law stay a recorded rule with no player-facing step?

Looked at again Oct 17 (claude, nothing built), following the rule that an owner question is flagged and the simplest version built. The simplest version counts a claimant's contacts as the openings they applied to in the week (the weekly pass in jobs.ts that fills `applications`). It would cut off benefits for almost everyone, because a played year ends with no position standing open in any place measured (the findings on world-hires-below-jolts), so a claimant has nothing to apply to; a real search contact is an inquiry to an employer whether or not a position is posted. The check cannot be built honestly until the model has searching that is not tied to an open position. Depends on the hiring items (world-hires-below-jolts, world-customers-move-between-sellers).

Oct 20 (pool feeder): spec written; the owner ruling answers the old question (recorded law, simulated, no paperwork). The earlier objection was that contacts tied to posted openings would starve every claimant, so contacts are sized from effort and the labor market, not postings, and world-hires-below-jolts is not required first.

Looked at Oct 17 (claude), not built, for two reasons. First, this is the kind of step the owner's rule keeps out unless asked for by name: "This is a game, not a spreadsheet" (AGENTS.md) says research calibrates the simulation and never adds a step to the player's life, and a weekly count of job contacts that withholds a benefit is a form to fill in; the item is a question for the owner (is a work-search requirement something the player should meet?), and `docs/roadmap/political-process-baseline.md` has no row asking for it. Second, there is no honest "contacts this week" to read: the weekly application pass (`jobs.ts` about line 1418) makes a seeker apply to every opening in their own place, so in a small town with two openings every claimant would fall below a five-contact rule through no fault of theirs, and a seeker's search beyond the town (online, by mail, commuting) is not modeled. Recommend the CTO takes it to the owner before anyone builds it.

Oct 23, merger A: The historical question above was answered by the later owner ruling already recorded in main Notes: the law is simulated without player paperwork, contacts come from effort and the labor market, and posted openings do not block this item. This note does not reopen that question or replace the current written acceptance. No implementation is completed by this historical Notes addition.

Sent back 2026-10-23 from PR #5595 (branch claude/political-game-pool-yucp92-ad): Normal main integration conflicts in src/core2/jobs-benefits.ts; resolve code while preserving current payment/funding and search readers and rerun the generated-year proof; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5595 (branch claude/political-game-pool-yucp92-ad): Posted-opening contact caps contradict OWNER-DECISIONS regional labor-market ruling; the player exemption is unregistered and the Done-when table is missing; finish on that branch, merge main into it first.
