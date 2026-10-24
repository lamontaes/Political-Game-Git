---
id: world-apply-and-buy-reasons-vary
title: "Applying for a job and buying a home carry circumstances that vary between people"
area: world
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr: #5812
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Every unemployed seeker scores the same need to apply and nobody buys a home in a played year, so no trait weight can act; give both decisions varying circumstance reasons, then calibrate.

**Rules.** TODO

**Done when.** TODO

**Files.** src/core2/modules/jobs.ts, src/core2/modules/housing.ts

**Notes.** TODO

Sent back 2026-10-23 from PR #5812 (branch claude/apply-buy-reasons): Apply-only changes point at an umbrella with TODO acceptance and an explicitly unfinished home-buying row; give the slice bounded written acceptance and resolve or baseline the reported opening-seekers failure; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5812 (branch claude/apply-buy-reasons): jobs.ts:1829 still gives counted seekers a constant need while full people use the new runway score, contrary to the one-model rule; the new test selects alive people without jobs rather than actual seekers and can use children or retirees; share the rule across tiers, prove actual seeker/fill-in witnesses, and correct its one-case versus body2/2 count; finish on that branch, merge main into it first.
