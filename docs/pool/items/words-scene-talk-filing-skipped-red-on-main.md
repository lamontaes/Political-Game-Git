---
id: words-scene-talk-filing-skipped-red-on-main
title: "src/director/scene-talk.test.ts is red on clean main: the filing purpose is skipped instead of composed (three tests), and one test times out"
area: words
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #8135
blocked-on:
lead: words
source: Fable, Nov 10, 2026, seen while checking the words pull requests and rerun on clean main at ee9d543f05
merged-at: 2026-11-10T10:45:18.737Z
seen-by: second-session-2
seen-at: 2026-11-11T03:51:37.551Z
---

**What.** On clean main at ee9d543f05 (Nov 10), `npx vitest run src/director/scene-talk.test.ts` fails four of nine tests with the default seed (scene-talk-test). Three fail with 'filing: expected skipped to be composed': 'composes every purpose: setup, open, statement, four replies, an answer and a close, in the bank's own words', 'plays every purpose in play, and never says a line the owner rejected' and 'composes a tree: every reply has its branch, numbers are unique, nodes are bounded, a lie shows both outcomes'. The fourth, 'answers by the same lean every decision reads', times out at 30 seconds. So the scene where the player files for office has a step with no line that may play, and in the game that scene is skipped.

**Rules.** Red main comes first (owner, Oct 15). No hand-written player text in code: the missing line is a bank piece. Never skip or loosen the test to get green.

**Done when.** `npx vitest run src/director/scene-talk.test.ts` passes on main with the default seed and in two drawn places named with their seeds, and the pull request says which step of the filing scene had no line and why (a piece held by a grade, a pulled line, or a fact the fixture does not give). A second session files for office in the running game in a drawn place and sees the filing scene play, with a screenshot.

**Files.** src/director/scene-talk.test.ts, src/director/scene-talk.ts, data/english/parts/scene-talk.json, src/director/data/purpose-arcs.json

**Notes.** Not checked: which commit turned it red, and whether the timeout is the machine or the test (it ran beside other tests here). The same four fail on the words-machine branches (#8114, #8117, #8124), which do not touch the filing scene. Skill red-main says how to take it from here.

Seen in the game (2026-11-11, second-session-2): Frederiksted, U.S. Virgin Islands (game); test seeds ac9f0085ce71, c3b0637a6b, seed 8b373c2a-d525-4551-a841-30e7109af826; ac9f0085ce71; c3b0637a6b, main 6df0379a: scene-talk.test.ts passed 9 of 9 on the default and two fresh seeds; in the game the filing counter in Frederiksted offered Delegate and Senator races and filing took 180 minutes
