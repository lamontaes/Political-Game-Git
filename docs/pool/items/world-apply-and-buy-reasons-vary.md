---
id: world-apply-and-buy-reasons-vary
title: "Applying for a job and buying a home carry circumstances that vary between people"
area: world
kind: wiring
priority: 3
size: M
status: in-pr
claimed-by: claude/apply-buy-reasons
pr: #5812
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T14:47:26.266Z
---

**What.** Every unemployed seeker scores the same need to apply and nobody buys a home in a played year, so no trait weight can act; give both decisions varying circumstance reasons, then calibrate.

**Rules.** TODO

**Done when.** TODO

**Files.** src/core2/modules/jobs.ts, src/core2/modules/housing.ts

**Notes.** Apply half built (PR for claude/apply-buy-reasons): `unemployedNeed` in jobs.ts scales the need to apply by the household's runway in days, as the look decision already did; the test is src/core2/jobs-apply-need-varies.test.ts. The home-buying half is not built: nobody buys in a played year, so its circumstance reasons need the buy path (see world-counted-renters-buy) first. Item stays open for that half.
