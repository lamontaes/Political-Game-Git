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

**Rules.** No dice: how hard a person presses to apply, or whether they buy, follows their own circumstances (the household's money runway, income, savings), never a roll or a fixed share. Sliding scales: the need grows smoothly as the runway shortens. An effect is a read: the apply score is read by the jobs engine's decision and the reason is saved for the player and the people they deal with. One model, two tiers: a counted seeker is scored by the same rule as a full person.

**Done when.** (1) Applying: in a drawn place (named with its seed) two job seekers with different household money runways score different needs to apply, the shorter runway higher, by person id, and a test in src/core2/jobs-apply-need-varies.test.ts shows it. (2) Buying a home: in a one-year played world in a drawn place, home purchases happen and each carries a circumstance reason that differs between buyers, by record id; this half waits on the buy path in world-counted-renters-buy, and the item stays open until it is met.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/housing.ts

**Notes.** Apply half built (PR for claude/apply-buy-reasons): `unemployedNeed` in jobs.ts scales the need to apply by the household's runway in days, as the look decision already did; the test is src/core2/jobs-apply-need-varies.test.ts. The home-buying half is not built: nobody buys in a played year, so its circumstance reasons need the buy path (see world-counted-renters-buy) first. Item stays open for that half.

Sent back 2026-10-23 from PR #5812 (branch claude/apply-buy-reasons): Apply-only changes point at an umbrella with TODO acceptance and an explicitly unfinished home-buying row; give the slice bounded written acceptance and resolve or baseline the reported opening-seekers failure; finish on that branch, merge main into it first.
