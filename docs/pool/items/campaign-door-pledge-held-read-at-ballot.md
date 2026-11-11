---
id: campaign-door-pledge-held-read-at-ballot
title: "The door-yes test reads how far a pledge held on the day the ballot was cast, not after the election"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-campaign-door-pledge-held-read-at-ballot
pr: #8525
after:
blocked-on:
source: added with npm run pool -- add
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:21:28.095Z
branch: claude/pool-campaign-door-pledge-held-read-at-ballot
---

**What.** In src/core2/door-pledge.test.ts, the test 'a door yes is near-binding' fails in Merizo, Guam (territory:GU:merizo, seed e1fedb0d3a7de565c35eaf9f988e4bc793010cc88e0dc52957a07a8ba6e6466d) on main da7ec81210: ballot:contest:seat:US-GU:governor:2026-11-03:person_6920550c71951401 carries a pledge part of 1.9336394 while the test expects 1.9337205. The test recomputes pledgeDoubt after the election, but pledgeDoubt reads relationships and news as of api.state.date, which moved after the ballot was cast, so a small drift in the voter's ties to the candidates shows up as a mismatch. Found by Lane 1 while checking #7142, where it fails the same way.

**Cause.** Found in code: src/core2/door-pledge.test.ts recomputes `pledgeDoubt` (src/core2/modules/voting.ts line 791) after the election, but `pledgeDoubt` reads relationships and news as of the state's date, which moved after the ballot was cast. In Merizo, Guam (territory:GU:merizo, seed e1fedb0d3a7de565c35eaf9f988e4bc793010cc88e0dc52957a07a8ba6e6466d) ballot:contest:seat:US-GU:governor:2026-11-03:person_6920550c71951401 carries a pledge part of 1.9336394 where the test expects 1.9337205.

**Fix.** Make the ballot keep the doubt it used (or have the test read the ballot-day facts). Keep the tolerance. Check that the pledge part equals the pledge weight times one minus that doubt, at 6 digits.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Ask why: the test checks what the ballot recorded against what the voter knew on the day they voted, by record. Never weaken a test: the tolerance stays; the comparison reads the ballot day's facts, or the ballot keeps the doubt it used. One rule, all 56 places: the fix passes on the Guam seed and on fresh draws.

**Done when.** A second session runs src/core2/door-pledge.test.ts with seed e1fedb0d3a7de565c35eaf9f988e4bc793010cc88e0dc52957a07a8ba6e6466d and GOLDEN_PATH_PLACE_KEY=territory:GU:merizo and on three fresh seeds in drawn places, sees it pass with place and seed printed each time, and sees the pledge part on each held ballot equal the pledge weight times one minus the doubt as of the ballot's own date at 6 digits. The test fails again when the ballot-day read is undone.

**Waits on.** Nothing.

**Files.** src/core2/door-pledge.test.ts, src/core2/modules/voting.ts

**Notes.** TODO

Released (2026-11-11): Does not reproduce on main 25369c9bac: door-pledge.test.ts with seed e1fedb0d... and GOLDEN_PATH_PLACE_KEY=territory:GU:merizo passes its near-binding test (the 'pledge as held' assertion at line 316 included). A different test in that file, 'a town whose counted records each stand for several households', fails there with 'no drawn town had a weighted counted record that a door reached and that votes in the race' (line 681) and on a random seed: file that as its own item. Continue on branch claude/pool-campaign-door-pledge-held-read-at-ballot.
