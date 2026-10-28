---
id: jobs-occupation-entry-experience
title: "Each occupation carries the experience a first job in it asks for, so a hire's fit can rank an entry-level opening by reliability and referral"
area: world
kind: feature
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
after: world-player-jobless-no-offers
source: added with npm run pool -- add
claimed-at:
---

**What.** A hire's fit for an opening counts experience in the occupation the same way whatever the job asks (`fit` in `src/core2/modules/jobs.ts`, about line 1660), so a first job in an entry-level role goes to whoever has the most years in the trade, and a young person with none is last in line. Make the fit read what the occupation asks (the table from `jobs-entry-requirement-by-occupation`): experience counts only up to the years the occupation asks, a shortfall below what it asks lowers the fit on a sliding scale, and where it asks for none the fit rests on reliability and a referral. Counted seekers use the same rule through `countedExperience`, times their count.

**Rules.** One model, two tiers: a counted seeker's fit is read by the same rule as a full person's. No dice: the ranking is the fit, never a draw; nothing flips at a threshold, a shortfall costs a share of the fit in proportion to how far short. An effect is a read: the table is read at the moment the engine ranks applicants. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE with their spread.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) an opening whose occupation asks no experience goes to an applicant with none over one with ten years in a different trade, and an opening that asks five years goes to the applicant who has them, each shown by the position record id, both applicants' fit values and the hire record id; a test in `src/core2/jobs.test.ts` covers both and a counted seeker alike. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json, src/core2/jobs.test.ts

**Notes.** Written Oct 20 (claude/entry-spec) from the code. `after: world-player-jobless-no-offers`, and the table comes from `jobs-entry-requirement-by-occupation`. Weights `jobsFitExperienceWeight`, `jobsFitReliabilityWeight`, `jobsFitReferralWeight` are the ones the fit uses today.

Oct 25 audit: unblocked; the spec was written Oct 20, so the empty-shell block no longer holds.

Sent back 2026-10-26 from PR #5089 (branch claude/item-entry-experience): the proposal already exists on main and this PR only adds a historical note, but line1 routes completion to the unimplemented game feature whose one-year hiring/record proof is absent; keep that feature open and bind the administrative scope to its own completion evidence; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `jobs-entry-requirement-by-occupation`; close into it and carry any line it lacks there. (pick the BLS-sourced design)
