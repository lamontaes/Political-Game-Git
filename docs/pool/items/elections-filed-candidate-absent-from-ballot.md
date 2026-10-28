---
id: elections-filed-candidate-absent-from-ballot
title: "Trace the reported accepted filing whose candidate is absent on election day"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** PR #6062 reports an accepted on-ballot U.S. Senate filing in Runge, Texas, yet the paged election-day ballot has no Test Voter candidate. Its logged run seed is f6ccb40e-f134-47d6-91a5-c9fe93ab1256, but the independent world seed was not retained in the body. This is a reported finding, not a runtime failure reproduced by Merger2; recover the actual world inputs and trace the filing, contest and candidate records before diagnosing its cause.

**Rules.** One rule, all 56 places: use existing filing and election writers, preserve exact contest and candidate identities, and never redraw based on whether the missing-candidate outcome appears. An effect is a read, not a record: accepted filing must be consumed by the actual ballot.

**Done when.** A generated-world test and ordinary bench replay name the full world seed, drawn place, accepted filing id, contest id and player candidate id; the same candidate appears on that exact election-day ballot and its kept mark is read by the voting engine. A documented no-candidate negative fails; if existing main already fixes the reported cause, identify its change and retain the named replay as regression evidence.

**Files.** src/core2/world-races.ts, src/core2/modules/voting.ts, src/director/polling-place.ts, src/bench/polling.browser.mjs

**Notes.** TODO
Oct 27 (claude/filed-absent): released unbuilt; the world seed is lost (PR #6062 logged only the run seed; polling.browser.mjs draws the place with drawPlace(runSeed, "polling-0"), which gives Runge, Texas, key 4863788, and the world comes from the browser's /api/newlife, a seed nobody kept). What I could check: in Runge (4863788, world seed ballot-probe-1) a player aged 36+ who filed for contest:seat:US-TX:us-senate:1:2026-11-03 with no party reached the polling-place ballot (pollingScene, src/bench/polling.ts) as a candidate on that contest, so the filing-to-ballot read works for an unaffiliated filing. Likely cause of the report: a filing with a party goes through the party primary, and `lose` in src/core2/modules/voting.ts (about line 1609) sets the filings that miss the cut to status "withdrawn"; ballot() in src/core2/modules/elections.ts (line 846) keeps only status "on-ballot", so a player who files as a Republican in Texas and loses that primary is, correctly, off the November ballot. That fits Lake Oswego (shown) and not Runge only if the Oregon contest has no primary cut for the player. To prove or disprove it someone needs the creator's player and party for the Runge run, or to file with a party after joinParty: my attempt to file party-bound in Runge was refused by the party-member rule even after joinParty (required "member of the party:US-TX:republican party"), which I did not run down. A negative test (a lost primary leaves the November ballot without the player, by record id) would document it.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): close (unreproducible without the seed).
