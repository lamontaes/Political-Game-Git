---
id: tests-accept-appointment-pinned-place-no-vacancy
title: "offices-accept-appointment-played.test fails on main: its pinned place, Ilwaco, Washington, no longer fills a local vacancy by appointment in the year"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/accept-appointment-drawn
pr: #6716
blocked-on:
lead: traits
source: wire-office session, Oct 28 (found red on main)
claimed-at: 2026-10-28T22:07:51.147Z
---

**What.** `src/core2/offices-accept-appointment-played.test.ts` fails on clean main at 2026-10-28 evening: "Ilwaco, Washington (5333000), seed 92ca8748de59, 2025-01-20 to 2026-01-20: offices.accept-appointment calls: expected 0 to be greater than 0". The test pins one place and seed, and the world main now builds there holds no local vacancy filled by appointment in the year, so the decision is never weighed. The same failure reproduces with the wire-office session's offices and officials changes set aside.

**Rules.** One rule, all 56 places: the witness world is found by drawing places from all 56 in a bounded loop until one fills a local vacancy by appointment, naming each place passed over, with Ilwaco kept only as a named regression. Never weaken a test: the decision's own weighed record, its reasons and the person taking office are all still checked. No dice: the appointee accepts or declines from their traits, as `leanedScore` already decides.

**Done when.** The test passes on clean main and on ten fresh draws, prints the place and seed it used and the places it passed over, and the PR body names, by record id in that played world, the vacancy, the weighed acceptance record and the took-office record that follows it.

**Time box.** 2 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Files.** src/core2/offices-accept-appointment-played.test.ts

**Notes.** Found while testing gov-sampled-legislator-seats-never-refilled; run alone with GOLDEN_PATH_SEED unset, it fails the same way every time because the place and seed are pinned.
