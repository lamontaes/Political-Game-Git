---
id: words-purpose-scenes-count-no-scene-maysville
title: 'purpose-scenes test is red by draw: it expects the office as titled, but the scene says it in running text ("council member")'
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: haiku
effort: low
root: rc6-scenes-repeat
lead: director
checked: fable 2026-11-10
---

**What.** src/director/purpose-scenes.test.ts fails on main with GOLDEN_PATH_SEED=b192e3dbed748f0f, as it does on branches that merge main. On its third draw, Maysville, North Carolina (3742100), the filer behind filing:contest:seat:gus2025:131738:council:0:2025-11-04:person_04962cc79c8da140 has no scene for the November 4, 2025 count: the test's check "the count fired no scene" finds no schedule entry for the election-result record. The test draws its place at random, so this turns CI red on any director change whose run lands on it. The cause is not yet known: the count's moment may be missing, unbound, or held by the month's repeat window.

**Cause.** Found in code: the Maysville miss no longer reproduces. `GOLDEN_PATH_SEED=b192e3dbed748f0f npx vitest run src/director/purpose-scenes.test.ts --maxWorkers=1` passes on main d64255aa (Nov 11), as it did on Nov 10. The test is still red by draw for another reason. At `GOLDEN_PATH_SEED=sweep-fresh-13897` (Paradise, Kansas, 2054325, draw 0) it fails at src/director/purpose-scenes.test.ts line 152, `expect(office.text, here).toBe(contest.title)`, with "expected 'council member' to be 'Council member'" for filing:contest:seat:gus2025:126960:council:0:2025-11-04:person_6ebdcf651eaa02b8. In src/director/purpose-scene.ts (line 960) the scene's `office` fact is `titleInSentence(said.office)`. `titleInSentence` (src/director/swearing-in.ts line 62) lowers a title with only an initial capital, so it reads as a common noun in running text ("your run for council member"), and keeps one with other capitals ("Town Council"). So every place whose seat is titled with one capital fails the test. The code is right; the test predates the running-text rule.

**Fix.** In src/director/purpose-scenes.test.ts, line 152, compare the scene's office fact with `titleInSentence(contest.title)`, imported from src/director/swearing-in.ts, instead of `contest.title`. Leave line 150 as it is: the cause's own fact still carries the record's title. Change nothing in the director.

**Time box.** 1 hour for one Haiku session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: the cause is named by record before anything is changed. One rule, all 56 places: no place-specific branch in the director or the test. No dice: nothing decides the outcome but records.

**Done when.** A second session, not the builder, runs src/director/purpose-scenes.test.ts at `GOLDEN_PATH_SEED=sweep-fresh-13897` (Paradise, Kansas) and `b192e3dbed748f0f`, and on three fresh draws (place and seed named) in the played world, and sees it pass. In dev mode, the family's talk about the filing in Paradise says the seat in running text ("council member"), citing the filing record id.

**Waits on.** Nothing.

**Files.** src/director/purpose-scenes.test.ts, src/director/swearing-in.ts, src/director/purpose-scene.ts

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/director/purpose-scenes.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=b192e3dbed748f0f: 1 of 1 passed (green on the item's own seed). Fresh draw GOLDEN_PATH_SEED=sweep-fresh-13897: red, a different assertion from the item's. As printed: `AssertionError: Paradise, Kansas (2054325), seed sweep-fresh-13897:0: filing:contest:seat:gus2025:126960:council:0:2025-11-04:person_6ebdcf651eaa02b8: expected 'council member' to be 'Council member'`. Still red by draw.

Nov 11 (cause finder for Fable B): reran on main d64255aa. The item's seed passes. The red by draw is now the office's capitals: the test expects the record's title, and the scene says it in running text through `titleInSentence`. The fix is one line in the test.
