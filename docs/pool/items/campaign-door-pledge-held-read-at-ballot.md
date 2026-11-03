---
id: campaign-door-pledge-held-read-at-ballot
title: "The door-yes test reads how far a pledge held on the day the ballot was cast, not after the election"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In src/core2/door-pledge.test.ts, the test 'a door yes is near-binding' fails in Merizo, Guam (territory:GU:merizo, seed e1fedb0d3a7de565c35eaf9f988e4bc793010cc88e0dc52957a07a8ba6e6466d) on main da7ec81210: ballot:contest:seat:US-GU:governor:2026-11-03:person_6920550c71951401 carries a pledge part of 1.9336394 while the test expects 1.9337205. The test recomputes pledgeDoubt after the election, but pledgeDoubt reads relationships and news as of api.state.date, which moved after the ballot was cast, so a small drift in the voter's ties to the candidates shows up as a mismatch. Found by Lane 1 while checking #7142, where it fails the same way.

**Rules.** Ask why: the test checks what the ballot recorded against what the voter knew on the day they voted, by record. Never weaken a test: the tolerance stays; the comparison reads the ballot day's facts, or the ballot keeps the doubt it used. One rule, all 56 places: the fix passes on the Guam seed and on fresh draws.

**Done when.** door-pledge.test.ts passes on seed e1fedb0d3a7de565c35eaf9f988e4bc793010cc88e0dc52957a07a8ba6e6466d with GOLDEN_PATH_PLACE_KEY=territory:GU:merizo and on three fresh seeds, each printing place and seed; the pledge part on each held ballot equals the pledge weight times one minus the doubt as of the ballot's own date, at 6 digits; the test fails again when the ballot-day read is undone.

**Files.** src/core2/door-pledge.test.ts, src/core2/modules/voting.ts

**Notes.** TODO
