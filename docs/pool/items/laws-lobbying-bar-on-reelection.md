---
id: laws-lobbying-bar-on-reelection
title: "A re-elected resident is barred from lobbying while still in office: seatWinner writes a term ended on re-election, and lobbyingBarredUntil reads it as leaving"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: laws
claimed-at:
---

**What.** On a re-election, seatWinner ends the serving term and seats the same person on a new term. lobbyingBarredUntil (src/core2/law-reach/group-a-voting.ts:617-629) reads the ended term as the official leaving office and starts the revolving-door bar. So a sitting resident who won again is treated as a former official barred from lobbying. Found by the laws lead's review of the speed lead's fold proposal (core-long-run-election-and-term-rows), Nov 2.

**Rules.** The law decides who is barred: the bar starts when a person leaves the office, read from the term records, never from a term that ended because the same person was seated again. One rule, all 56 places: the bar's length comes from each state's own law row.

**Done when.** In a buildBenchWorld world drawn from all 56 (place and seed named) where a resident officeholder is re-elected, lobbyingBarredUntil returns no bar for them while they serve, and returns the state's bar from the day they leave office, by term record id; a test in src/core2 proves it and fails without the fix.

**Files.** src/core2/law-reach/group-a-voting.ts, src/core2/modules/voting.ts

**Notes.** TODO

Nov 2, 01:20 UTC (laws lead, progress record): branch claude/laws-lobbying-bar-on-reelection, not pushed yet; a Sonnet helper is building it in /home/user/h-lobby (cause per the review: seatWinner ends the serving term on a re-election and lobbyingBarredUntil, group-a-voting.ts:617-629, reads it as leaving; fix: a person leaves an office only when no serving term of theirs continues past the ended one). Next: review the helper's diff, open the PR (line 1 Pool item: laws-lobbying-bar-on-reelection), hand it to the checker by PR number mod 5. If the branch is missing on the remote, start again from main: the item's What, Rules and Done when are the brief.

Nov 2, 01:50 UTC (laws lead, HANDOFF, set back to open): branch claude/laws-lobbying-bar-on-reelection, head 53866ce710, tests passing. Cause: seatWinner (offices.ts ~1761) ends the serving term with endedBy 'term ended' on a re-election, and lobbyingBarredUntil (group-a-voting.ts ~617-629) excluded only 're-elected', which only the opening history writes. Fix (reader only): departures() counts an ended term as leaving only when none of the person's other terms in the same office continues past it. Tests: src/core2/lobbying-bar-reelection.test.ts on seeds lobby-bar-a (Buckskin, Indiana, 1808848: person_c05b0b06c95dd4a8 re-seated term:seat:gus2025:126151:board:0:2026-01-01:elected, no bar; resigned 2026-03-04, barred until 2028-03-04) and lobby-bar-b (Orwigsburg, Pennsylvania, 4257184); the old reader fails it; law-wiring-government.test.ts 3 of 3. Left: one adversarial review of the diff (the departure rule on a seat change within one office, an appointment back after resigning, null personIds, the opening's past chain; other readers of endedBy; whether the test can pass with no re-election), then the PR with line 1 `Pool item: laws-lobbying-bar-on-reelection`, handed to the checker by PR number mod 5. Note for the PR: the bar's length is one ESTIMATED parameter (lobbyingCoolingOffYears, 2 years), not per state.
