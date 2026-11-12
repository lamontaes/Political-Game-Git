---
id: tests-journal-margin-and-narration-once-flaky-on-drawn-seeds
title: "Two director tests pass or fail by the drawn seed: the journal's race margin and narration said once"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "Merger 7, Oct 27 13:10 UTC, while rechecking scene PRs"
lead: director
milestone: play-first
claimed-at:
after:
model: sonnet
effort: low
root: design-words-machine
checked: fable 2026-11-10
---

**What.** Two director tests flip with the drawn seed on clean main: journal-race-margin (the journal line after an election names the margin) and scene-narration-once (a scene's narration is said once, never repeated). Merger 7 saw both while rechecking #6260 and #6201. A test that passes on one seed and fails on another is either reading a real defect that only some worlds show (a margin of zero, a tie, a scene re-entered) or asserting something the records do not promise. Find which on a failing seed and fix the one that is wrong, the engine if the world is wrong, the test if the expectation is; never widen the test to pass. Guards: the Journal line after an election names the margin, and a scene's narration is said once.

**Cause.** Found in code: the margin test can never pass, because no journal line that claims a margin can be said, and the narration test no longer fails. 1. The journal takes its lines for one's own race from the bank parts that name a journal target (src/english/mined/journal-bank.ts `journalDataFromBank`: only `use.journal` targets enter a field). The three margin parts in data/english/parts/journal.json, journal.election-line-own-result.it-was-close ('It was close.'), it-wasnt-close ('It wasn't close.') and it-was-very-close ('It was very close.'), each have `journal: []`, so the `won:close` and `won:wide` stages (src/director/journal.ts line 1535) have only margin-free lines ('We won.', 'We lost.', 'I won by {votes} votes.'), and a first-time loser gets the memoir line ('I didn't win.'). The test (src/director/journal-race-margin.test.ts line 130) requires at least one line that claims a margin, so it fails in every world. Measured on main 3474b29f with a fresh seed (Jauca, Puerto Rico, 7238241): every candidate's line was 'I won.', 'I lost.' or 'I didn't win.', and the test failed with 'no claimed margin checked'. 'It was close.' carries one owner grade of fix (data/english/part-grades.json line 451). 2. src/director/scene-narration-once.test.ts passed on main 3474b29f with its recorded failing seed 66ed52ba766be6d0873ae3c267b94d47255aa977 and with a fresh seed.

**Fix.** 1. The Story session (the lines under data/english/parts are theirs alone, owner Nov 10) gives the margin parts a journal target, `{ "kindPrefix": "event:election", "field": "ownLine" }`, or writes margin lines that answer the owner's fix grade on 'It was close.'; `ownRaceStages` already files a line that says close under the close stage only and one that says not close under the wide stage only. Post the request on the crew's issue naming these three parts and this item. 2. Once a margin line is in the bank, rerun the margin test on the recorded seeds and three fresh ones; it should pass without a change. If a fresh draw still finds no watched candidate in a close or wide race, add draws (the drawn-place-tests skill) and log each place passed over with its races' leads. 3. The narration half needs nothing; close it with the two runs above.

**Time box.** 1 hour for one Sonnet session, once the margin lines are in the bank. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: a test draws its place and must hold in every world. Ask why: the failing seed's records answer why the margin or the repeat happened. No dice: a scene is said once because its record says it was, not because a counter was reset.

**Done when.** A second session runs both tests on main's head on the seeds that failed (named in the PR body) and on three fresh draws each, and sees every run pass. The PR body names the cause of each flip by record id, and the journal names the margin of a lost or won race in a drawn place without the test needing a lucky seed.

**You will see.** Nothing new on screen; the journal names the margin in every world and no scene repeats its narration.

**Screenshot.** Not a screen; the test output on the failing seeds in the PR body.

**Waits on.** The Story session wiring the journal's margin lines (data/english/parts/journal.json, the three election-line-own-result margin parts).

**Files.** src/director/journal.ts, src/director/scene.ts, src/director/journal-race-margin.test.ts, src/director/scene-narration-once.test.ts

**Notes.** Merger 7, Oct 27 13:10 UTC: "Flaky on drawn seeds, worth a pool item: journal-race-margin, scene-narration-once." The third one it named (opening-unemployment-scope) is `tests-opening-unemployment-scope-red-on-drawn-seed`. Lead: director.

**Notes.** Evidence (wire-people-and-director, Oct 28 08:40 UTC). #6585 fixed one cause of `scene-narration-once`'s flips: a scene's lead looked the opener up, marking their name as said, without saying it, so the opening used the first name alone ("The phone rang. River has something to ask you."). That was in Echo, Utah, seed `6cb84ec8580ee76a0a2ed87871d51f4d394da78d`. The test also counted that artifact as a lead naming the opener. Since #6585, with seed `66ed52ba766be6d0873ae3c267b94d47255aa977`, the test fails on main the other way: no scene in its four places has a lead that names the opener (Keizer, Oregon, 22 scenes with an opener). The 18-year-old player now opens knowing family only (`SG-WIRE-PEOPLE-SCHOOLMATES`), so fewer people are watched; widening the watch to the household's known people still found none (54 scenes). Twin filed in error: `tests-scene-narration-once-no-lead-sample`.

**Notes.** Evidence (Words, Nov 1 21:50 UTC). `journal-race-margin.test.ts` fails on main at seed `17ce2f31491373a0682ed58cba7fc2dc5c2b7752` with "no claimed margin checked": in four drawn places (Venice, Illinois; Harrisonburg, Virginia; Rutland and Turners Falls, Massachusetts) about 50 candidates' Journals said "I lost.", "We won." or "I got elected." and none happened to pick a margin line ("It was close."), so the test had nothing to check. Why no margin line was chosen in any of them is not traced yet. Found while checking #7065.

**Notes.** Evidence (Lane 3, Nov 4 UTC). Still red on drawn seed `c256853f54d210d918a2678fcf106b512083de11` (also with Lane 3 head 3a8a08e2): "no claimed margin checked" in Antelope Hills, Wyoming; the state auditor race (3 candidates, lead 0.069) journals only "I didn't win.", with no margin to check.

**Notes (Fable's check, Nov 10, from the dropped tests-scene-narration-once-no-lead-sample).** Seed 66ed52ba766be6d0873ae3c267b94d47255aa977 draws Keizer, Oregon: 22 scenes with an opener and none whose lead names them, and widening to the household's known people still found none in 54 scenes. Since pull request 6585 an 18-year-old opens knowing family only (stopgap SG-WIRE-PEOPLE-SCHOOLMATES), which is a lead for the narration test: people-no-shared-school-or-work-between-people-at-the-start now has that cause. The merge desk also met src/director/journal-race-margin.test.ts red on main on Nov 10.

Cause found (Nov 11, 2026, cause finder for Fable B): the margin lines exist in the bank but name no journal field, so the journal cannot say them; the narration test passes on its recorded seed and a fresh one. This item now needs only the Story session's line change and a rerun.
