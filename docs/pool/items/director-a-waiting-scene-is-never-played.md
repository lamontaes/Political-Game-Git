---
id: director-a-waiting-scene-is-never-played
title: "A scene the director stages and marks as waiting is never played, so most staged scenes never reach the player"
area: director
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by: Words builder W7
pr:
after:
blocked-on:
lead: words
model: opus
effort: high
root: rc2-done-from-records
source: lead's reading of the code after two findings on Nov 11, 2026 (Words builder W7's pictures for the reporter's call; Seen helper C's 100 played days as an official with no office-hours visit)
checked:
claimed-at: 2026-11-11
---

**What.** The director decides, for each moment in a watched life, whether it is a scene now, a scene that waits, or a journal line. Only "a scene now" ever plays. A scene that ranks within the life's pace and is not an interrupt is staged, cast and written on the ledger as waiting, and then nothing opens it. Two sessions hit it on Nov 11. Words builder W7, playing a seated council member in Pocatello, Idaho (seed w7-press-b): a reporter's call was staged on the day of her own floor vote and never came. Seen helper C, playing a council member in Hudson Falls, New York (seed a2bdef34-c13f-438c-be8b-e4f5883a501f): five residents' cases were open on February 19, 2025, and in 100 played days no resident came to office hours. The lead's own walks found five quiet days in a row after the opening. Seen: any played week, in which the scenes the director staged for the player open when the player next has control, and a quiet week is quiet because nothing ranked, never because nothing read the ledger.

**Cause.** Found in code: `scheduleMoment` in src/director/scheduling.ts (line 1036) gives a staged moment the outcome `scene-now` when it is an interrupt (its impact is at or above `interruptImpact`, or it is family news, met where the player is, met through a tie that day, or its type has `stopsDay`), `scene-waiting` when it ranks within the pace in live play, and `journal-line` otherwise. `registerInterrupts` in src/director/ledger.ts (line 1634) registers a stop on the player's clock for interrupts alone. The outcome `scene-waiting` is read in two places and neither plays it: `forget` (ledger.ts line 699) keeps a waiting moment from being summarized, and src/director/reach.ts (line 43) counts it. src/bench/story.ts (lines 83 and 271) opens a staged scene only when handed its moment id. Of 103 situation types in src/director/data/situation-types.json, one has `stopsDay`. The design says what should happen (docs/design/story-director.md, part 4, "When"): at the cause, "the scene opens the first time the player has control after the record is written"; on an effective date, that day; at the next meeting, "the next time both people are in one place". That reader was never built.

**Fix.**

1. **One reader of what waits.** In src/director/ledger.ts, beside the interrupts: `waitingScenes(core, personId, at)` returns the player's waiting entries that are due at this moment, in rank order, by each type's `timing`: `at-cause` is due from the next time the player has control; `effective-date` on its date; `next-together` when the player is in one place with the other person. An entry past its `openDays` falls to a journal line with the reason "not met in time" on its schedule entry, as a held-back cause is recorded today.
2. **The clock stops for one a morning.** When the player's clock reaches a day's start and a waiting `at-cause` or `effective-date` scene is due, register the stop the way `registerInterrupts` does, with kind `waiting`, one a morning in rank order; the rest wait for the next morning. The pace already limits how many rank (about three a year at 13 to 17 and four for an adult), so this adds scenes the design meant to play and no flood.
3. **Meeting someone opens what waits between you.** When the player opens a talk with a person (`openConversation` through the bench's talk route) or arrives where they are (the visit), a due `next-together` scene with that person plays first, in place of the stock talk.
4. **No daily scan.** Keep the waiting entries per watched person as they are written (the schedule is already per person); read the list only on the player's own stops and talks.
5. **Dev mode shows them.** The dev scene list names each waiting scene of the player, its type, its rank against the pace and when it will open, so a second session can see the ledger and the play agree.
6. **The reporter's call.** With this built, the narrow fix in scene-reporter-call-after-a-vote-never-plays (setting `stopsDay` on one type) is not needed; close that item into this one.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record (owner, Oct 13): a scene on the ledger that nothing plays is a record nobody reads. One engine per mechanic: one reader in the director says what waits and when it is due, and the bench's clock and talk route both call it; neither keeps its own list. No dice: which scene opens is the scheduler's rank and the type's timing, never a chance. Speed (owner, Oct 29): nothing scans every watched life every day; the list is read on the player's own stops and talks. One rule, all 56 places: the checks draw their places and name them with their seeds.

**Done when.** A second session, in the running game on main at 1440x900, plays three new lives in drawn places it writes down with their seeds, 60 days each, one of them an Advanced start as a seated local official. For each life it sets the dev scene list beside what played: every scene the list showed as waiting either opened (on a morning, or when the player met the person) or fell to a journal line with its reason, and none stayed waiting past its open days. The official's life has at least one resident come to office hours or one reporter's call after a vote. A test in src/director plays a drawn world for 60 days and fails when a waiting entry of the player's is neither opened nor closed with a reason. `npm run speed:year` on the same seed is within the 20 percent rule against its base.

**Waits on.** Nothing.

**Files.** src/director/ledger.ts, src/director/scheduling.ts, src/director/reach.ts, src/director/conversation.ts, src/bench/story.ts, src/bench/handler.ts, src/bench/player.ts, src/bench/dev-mode.ts, src/director/waiting-scenes.test.ts (new)

**Notes.** Written by the lead (Fable B), Nov 11, 10:15 UTC, from the code and two helpers' findings. The count of waiting entries in a played year is not yet measured; the builder measures it first, in two drawn places, and writes the numbers here before changing anything: how many of the player's moments were `scene-now`, `scene-waiting` and `journal-line` in 60 days. If waiting scenes turn out to be reached some other way that this reading missed, say so here and stop. Related: scene-reporter-call-after-a-vote-never-plays (W7's narrow item), the cause finder's item on office hours never visiting a played official (asked for at 09:50 UTC), director-casting-rule-on-every-scene-kind (PR 8451: who a scene may come to).

Measured by Words builder W7, Nov 11, 2026, before any code change. The player's own clock ran 60 days from the opening (`advancePlayerV1`, every stop resumed and the first offer taken at each choice), and the player's ledger was counted by outcome:

- West Point, Nebraska (place key 3152575, seed `w7-wait-a`), to March 20, 2025: 4 `scene-now`, 4 `scene-waiting`, 72 `journal-line`. All 4 stops the director opened were the `scene-now` entries; none of the 4 waiting entries opened. Waiting by type: `address` 3, `gathering-missing` 1.
- Breñas, Puerto Rico (place key 7208700, seed `w7-wait-b`), to March 20, 2025: 3 `scene-now`, 3 `scene-waiting`, 18 `journal-line`. All 3 stops were `scene-now`; none of the 3 waiting entries opened. Waiting by type: `address` 2, `gathering-missing` 1.

One more reader than the Cause names, on the opening day only: the bench's new-life route (src/bench/handler.ts, the `/api/newlife` route, "A scene the director already staged for today ... plays first") sends the first scene entry dated that day, waiting or now, as `sceneMomentId`, and the page opens it. That is how the President's address on the opening evening plays. It does not reach any waiting scene after the first day, so the reading holds from day two on, and the build goes ahead. The new reader should take over that opening-day case too, so there is one reader of what waits.
