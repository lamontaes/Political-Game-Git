---
id: tests-conversation-farewell-no-talks
title: "conversation.test.ts: 'never parts with a word the talk already said' finds no talk with a farewell"
area: words
kind: bug
priority: 1
size: S
status: done
standard: 2
claimed-by:
pr: #8176
blocked-on:
source: added with npm run pool -- add
after:
lead: words
model: haiku
effort: low
root: none
checked: fable 2026-11-10
merged-at: 2026-11-10T18:37:40.000Z
seen-by: second-session-2
seen-at: 2026-11-11T00:58:36.806Z
---

**What.** src/director/conversation.test.ts "never parts with a word the talk already said" fails on main (fixed world, seed conversation-test): expected 0 to be greater than 0. Of the first 25 people the player knows, none reaches a farewell in 8 turns, and the first one's talk opens with no lines and no choices at all. The engine may be right to say nothing for a person with nothing on record, so the first question is whether the test picks people who have anything to say. The Notes record that run alone, or paired with any one earlier test, it passes, and that in the full file every known person opens an empty talk, so earlier tests leave something behind.

**Cause.** Found in code: src/director/conversation.ts, `say` (line 3172: "The listener remembers what this talk was about") writes `talk:<player>:topic:<topic>` into the listener's knowledge in the shared core, and `openConversation` (lines 2278-2282) puts every remembered topic into `conversation.used`; with nothing left, a talk that is only a greeting is emptied (lines 2297-2305, owner, Oct 24). The fixed world (Jackson Center, Ohio, seed conversation-test) has five people the player knows. The file's earlier tests talk to all five on the same core, so by the farewell test each one remembers two or three topics: person_5e2074355a8d874f and person_5e2076355a8d8ab5 (housemates) remember `own-view` and `quiet:...:2021-01-05`; person_1d03c37835fa8d4e and person_267d238b581d3818 remember `home:person_5e2073355a8d859c`, their own `own-work` and `family:person_5e2074355a8d874f`; person_9c8603d75f4992d1 remembers `home` and `own-work`. All five then open with 0 lines and 0 choices. The engine is right (owner, Nov 1: a talk with nothing new is no talk); the test's pick was wrong. Run alone, the same five talk, but the three non-housemates end on the player's answer to their school question with no goodbye, by the rule in `endConversation` (lines 2970-2981), so no farewell is found either way. Commit 94b8877056 (Nov 4, 16:40 UTC, ten hours after this item was filed) changed the test to go on past the known people to every other full person, up to 60, and those strangers have no remembered topics; #8176 (Nov 10) kept that. The test passes on main 6af036c7 as a whole file, on seed conversation-test and on a fresh draw (Pamelia Center, New York, seed 799e81757157).

**Fix.** Nothing is left to build in the engine or the test. A second session runs the file on main as below; if it passes, the lead closes the item as fixed by 94b8877056. If it fails, the farewell test should talk to people no earlier test in the file talked to (or start from a core no earlier test used), never clear the listener's remembered topics in the engine.

**Time box.** 1 hour to run the file on main on the fixed seed and one fresh draw and record the result.

**Rules.** A talk with nothing on record says nothing (owner, Oct 24); a talk with nothing new is no talk (owner, Nov 1); fix the test's pick only when the engine is right (words-engine skill). Ask why: the cause above names, by record, why the first known people opened empty talks.

**Done when.** A second session runs src/director/conversation.test.ts as a whole file on main's fixed world (seed conversation-test) and on one drawn place and seed nobody chose (GOLDEN_PATH_SEED set), and sees "never parts with a word the talk already said" pass, with at least one talk reaching a farewell within eight turns.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts

**Notes.** Filed by Lane 3 (Nov 4), found while checking lane3/everyday-answers; red on clean main (9e2f7a46). Unit tests don't run in main's Release workflow, so no red-main report named it.

Seen in the game (2026-11-11, second-session-2): fixed world (conversation-test seed); drawn seeds e1e4e434a7f2 and 0cb6ae68a2cd, seed conversation-test; e1e4e434a7f2; 0cb6ae68a2cd, main 1eeb8f85: conversation.test.ts as a whole file passed all 21 tests on the fixed world and on two fresh seeds, including the farewell test

**Notes.** Probe (Lane 3, Nov 4 UTC, main 9e2f7a46). The first five people the player knows, on 2021-01-10, are two housemates and three others in the same place, all alive, tier weekly. `openConversation` gives each 0 lines and 0 choices. `openConversation` has no early return, so the greeting (`words(..., "greet", "open", { statementsOnly: true })`) found no line and no subject offered a choice. Look at what `words()` reads for these speakers, and at the conversation bank since 9b34b8ec (talk after the address, Nov 1).

**Notes.** Lane 3, Nov 4, three tries, none passed (ruling 6), so this goes back to the pool. Findings:

- **Order:** the failure needs the whole file. Run alone, or paired with any one earlier test, it passes. In the full file every known person opens an empty talk (no greeting, no choices), so the effect builds up across the shared core.
- **The farewell rule:** where talks do open, `endConversation` suppresses the goodbye after the other's own question was answered (from c039ba68). Answering every question therefore ends with no farewell, and letting a question go by in silence brings one ("I have to go.").
- **Tried:** silence on every third turn; every known person instead of the first 25; a new day before the test.
- **Next:** find what in the earlier tests leaves `openConversation` empty, then let the player fall silent so talks reach a farewell.

**Notes.** Cause finder, Nov 10 (main 6af036c7). Ran the whole file on main: 21 passed. Ran the test as it stood before 94b8877056 against today's engine: the farewell test fails with "expected 0 to be greater than 0", as filed. A probe (working copy only, not committed) logged each known person's remembered `talk:` topics before the talk opened: two or three each, and every talk opened with 0 lines and 0 choices. Deleting those keys in the probe made the three non-housemates open talks that end on a farewell, and the whole file passed. Run alone, the five talk, but none says goodbye: the housemates' talks end on an acknowledgment after the player's view, and the others' on the player's answer to their school question. The test as #8176 left it also passes against today's engine. Fresh draw: Pamelia Center, New York, seed 799e81757157, 21 passed. Still unknown: why the two housemates still open empty with their remembered topics cleared (they may have nothing else on record on that day), and which earlier test wrote the `quiet:...:2021-01-05` topic.

**Notes (Fable B's check, Nov 10).** Checked against main: `say` writes the talked-over topic to the listener (src/director/conversation.ts near line 3172), `openConversation` puts every remembered topic into `used` (near line 2278) and empties a talk that is only a greeting (near line 2297). So the cause holds, and nothing is left to build. The item is marked merged with pull request 8176, which kept the test's fix, so that it goes to a second session and is not handed to a builder who could not close it.
