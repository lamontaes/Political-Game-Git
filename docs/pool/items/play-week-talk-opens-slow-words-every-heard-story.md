---
id: play-week-talk-opens-slow-words-every-heard-story
title: "A Week that stops on a scene takes seconds: opening the talk writes out every printed story the pair heard just to pick a subject"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: speed
model: sonnet
effort: medium
root: none
milestone: play-first
source: "Owner's Nov 8 sitting, row P41 (carryover N8-P41 of sitting 2026-11-23-1); timed by the Dead stops tracer (lane 5), Nov 23"
---

**What.** The owner, Nov 8 (P41): a Week took about 3 seconds, and he wants it faster. On main 7f04c334 a Week still takes 1.1 to 4.2 seconds of wall time, and the largest single cost is not the simulation. It is opening the talk of the scene a Week stops on.
Seen: the wait between pressing Week and the next screen or scene.

**Cause.** Measured: at Montezuma, Indiana, seed 1a56a9f4-8903-4947-b9d5-55037455d139, by a headless new life on main 7f04c334 with the bench server under an inspector CPU profile (1 ms sampling) over four Weeks from Feb 4 to March 4, 2025. Week wall times were 4.18, 1.14, 1.63 and 3.34 seconds, with one stop (the mayor's address, Feb 11). The days themselves (`player.ts` `advance` → `life.ts` `runDay`) cost 4.85 s of CPU over the four Weeks, about 1.2 s a Week. The largest step inside them was `candidacyDay` (src/core2/modules/candidacy.ts) at 0.72 s, and no other was over 0.4 s. Opening the stop's talk (`sceneNow`, src/bench/handler.ts:284 → `openConversation` → `subjectsBetween`, src/director/conversation.ts:2775) cost 4.26 s, 3.90 s of it in `composeNewsStory` (src/english/english-newscast.ts). Found in code: `printedHeard` (src/director/conversation.ts:2426) walks every story the speaker heard in the recent window, and for each one `printedSubject` calls `director.storyWords` (conversation.ts:2538; `wordPrintedStory`, wired at src/bench/world.ts:717). That composes the story's whole English text, whose only use there is its `sourceRecordIds` for the citation on the next line (:2539). It runs before the story is known to have a tie to the pair, so every story passed over is fully written and thrown away. The two speed branches named for this row don't reach it: `claude/speed-modulekey` changes `src/core2/module-data.ts` (about 0.2 s here) and `claude/speed-campaign-lists` changes `src/core2/modules/campaigns.ts` (about 0.2 s here).

**Fix.** In `printedSubject` (src/director/conversation.ts:2525), stop calling `director.storyWords` for every candidate story. Cite the story by its own id and the record ids its facts already hold, and compose its words only for the one story the talk actually raises, if the talk needs them. Prove with dev mode's records proof (skill `speed-work`) that the same subjects are chosen and the same lines play in a drawn life, and time a stop's talk before and after on the same machine. Then, if a Week without a stop is still over a second, profile `candidacyDay` as its own item.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Speed: a change that makes play faster must change nothing the player sees, proven by the records proof on the same drawn life before and after. Ask why: the timing names the place, the seed, each Week's wall time and the step that took it. No hand-written player text: no line is added or changed, only when the story's words are composed.

**Done when.** A second session starts a new life in a drawn place on main after the merge and presses Week until one stops on a scene: the talk opens in under half a second after Continue (timed from the request), and the records proof shows the same talk subject and lines as before the fix. It records the place, the seed, the times and a screenshot of the talk at 1440x900.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/bench/archive-words.ts

**You will see.** Pressing Week and then Continue into a scene is quick, with no pause of several seconds before the talk opens.

**Screenshot.** The talk a Week stopped on, from a drawn place, with the place, seed and times under it.

**Notes.** Profile breakdown (CPU seconds over the four Weeks): idle 5.61, `advance` 4.85, `sceneNow` 4.26, `followedBills` 0.32, `heardItems` 0.28. Within `advance`: `candidacyDay` 0.72, `activate` 0.40, `runScheduledWork` 0.39, world legislating 0.25, payroll 0.23, campaigns calendar 0.20, press calendar 0.14. The first Week of a life, which stops on the Governor's address the next morning, took 0.22 s.
