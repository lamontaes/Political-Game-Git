---
id: tests-electoral-scenes-speech-crowd-member
title: "electoral-scenes: a person the speech names is not in its crowd (Bascom, Florida)"
area: director
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-electoral-scenes-speech-crowd-member
pr: #8770
blocked-on:
source: added with npm run pool -- add
after:
lead: director
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T08:49:13.061Z
branch: claude/pool-tests-electoral-scenes-speech-crowd-member
merged-at: 2026-11-12T00:34:39.321Z
---

**What.** src/director/electoral-scenes.test.ts fails its second case on main on Nov 4 in Bascom, Florida (1203725), seed 78df996a2a76eb81378fcb7c5c00238bb398b33a: person_42e3dd4105e41fc4 was not in the crowd of speech:person_09cc581aaf91cdae:2025-10-05:speech:organization_f266a19676377820. A campaign speech is a stop with its listeners, and the listener the test checks is not among the crowd the speech record keeps, so the scene and the record disagree about who heard it. The fix is whichever side is wrong, the scene's cast or the speech's crowd. The campaign code the item named, src/core2/campaign-turn.ts, is gone; the speech and its crowd now live in src/core2/modules/campaigns.ts.

**Cause.** Found in code: the scene is right and the test reads a record that is gone by the time it looks. The campaign stop casts its voters from the speech's listeners as the speech is given (src/director/civic-roles.ts line 300, `retellingsOf`), and the speech engine writes the event's `witnessIds` and those listeners from the same audience (src/core2/modules/speech.ts lines 193 and 210). The test (src/director/electoral-scenes.test.ts line 275) reads the crowd from `core.durableLog.get(speechId).witnessIds` on election eve, but a speech is a circle entry, dropped from the log `circleActRetentionMonths` (3) after its day (src/core2/state.ts `retainLog` line 775 queues it; src/core2/decision-detail.ts `forgetEntry` line 396 deletes it). So for any speech more than three months before the election the crowd reads empty. Measured on main 48057392 with GOLDEN_PATH_SEED=e4b8aeceafbc7b66 (Homer, New York, 3635276; a working copy of the test logging each lookup, undone after): on 2025-11-03 both speeches, of 2025-02-16 and 2025-02-28, were no longer in the log (0 witnesses), and the test failed on person_56fcfa37ae0d8e2c. The item's seed now fails the same way in St. Lucas, Iowa (speech of 2025-07-31).

**Fix.** Change the test only. Before advancing to election eve, subscribe to `speech.heard` events (`coreAPI(core).subscribeEvents`) and keep each speech's `witnessIds` by its id as it is emitted; compare each campaign stop's voters against that kept list instead of the durable log. Keep every other assertion. Do not lengthen the log's retention for this.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the scene's listeners are the speech record's crowd, read from one place. Ask why: name by record why this person was expected and why the crowd left them out before changing either side. One rule, all 56 places: the check holds on every drawn place.

**Done when.** A second session runs src/director/electoral-scenes.test.ts on seed 78df996a2a76eb81378fcb7c5c00238bb398b33a and on two more drawn seeds named in the PR and sees every run pass. The PR names by record id why person_42e3dd4105e41fc4 was or was not a listener, and the scene and the speech's crowd read the same list.

**Waits on.** Nothing.

**Files.** src/director/electoral-scenes.test.ts, src/core2/modules/campaigns.ts

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/director/electoral-scenes.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=78df996a2a76eb81378fcb7c5c00238bb398b33a: 2 of 2 passed. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-<random> (the number was not kept and the test does not print its place): 2 of 2 passed. Green on both. The item's place (Bascom, Florida) is not pinned by the seed alone, so this does not prove that town. Proposed for the CTO: drop as fixed on main.

Cause found (Nov 11, 2026, cause finder for Fable B): reproduced today on the item's seed (St. Lucas, Iowa) and a fresh seed (Homer, New York); the Nov 10 passes were draws whose speeches fell within three months of the election. The lookup probe showed the speeches gone from the durable log on election eve.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 08:49 UTC) on branch claude/pool-tests-electoral-scenes-speech-crowd-member.
