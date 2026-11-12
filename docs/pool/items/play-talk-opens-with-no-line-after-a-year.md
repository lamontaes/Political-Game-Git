---
id: play-talk-opens-with-no-line-after-a-year
title: "A talk with someone at home opened with no line at all, only Continue and Mark gap, a year into a game"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-talk-opens-with-no-line-after-a-year
pr: #8401
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
source: second session's check of the words machine, Nov 10, 2026 (Notes on words-machine-rules-from-the-owners-notes); filed by Fable
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:34:23.118Z
branch: claude/pool-play-talk-opens-with-no-line-after-a-year
---

**What.** In a new game the player talked to a household member on the first day and got a line and four replies. A year later the player opened a talk with the same person and the box had no line, only the controls Continue and Mark gap. A talk with nothing to say should not open, and nobody knows yet why this one had nothing.

**Cause.** Found in code: a scene's own talk is opened by a road that skips the "has something to say" rule, and with the scene's moment id the talk can be empty. Reproduced on Rehoboth Beach, Delaware (place key 1060290), seed dc376939-ac22-45ce-836f-5027c4f0799f, player Owen, household Connor, Tracey and River (record ids person_e8319cfa8a65c17e for Owen; the world's own ids for the others). On main at ff98d6dc, in a bench world played week by week for 56 weeks (to Feb 22, 2026), the player's own scheduled `scene-now` moments with a housemate (Connor on Mar 6, Apr 10, May 15, May 23 and Dec 11, 2025; Tracey on Oct 3, 2025) were each opened the way the screen does: `/api/story?momentId=` gave `talkToId`, then `/api/talk/open?otherId=&momentId=`. Four of the six opened with the moment gave 0 lines (Apr 10, May 15, Dec 11 where the same talk without the moment gave 1 line; Oct 3 gave 0 either way). The first-day talk had a line and four replies; the housemates' plain talks also fall to 0 lines after the opening week (week 4 onward) because nothing recent is on record to say.
Why, by file and line. (1) src/bench/play.mjs `showStory` (about line 2122) plays the narration and then calls `talkTo(withId, momentId)` for any scene whose `talkToId` is set. It never asks whether the person has anything to say; the rule that does ("a talk that opens with no lines is no talk") lives only in `sceneNow` (src/bench/handler.ts lines 211 to 220), which only decides who is clickable in the room, and the scene's talk bypasses it. `talkToId` is chosen in src/director/scene.ts (around line 165) from the scene's binding, not from the talkable rule, so Tracey on Oct 3 opened an empty box even without a moment id. (2) With a moment id, `openConversation` (src/director/conversation.ts) leaves out the "brought it up" news: line 2231 reads `const brought = occasion ? null : bringItUp(...)`. A housemate has no greeting (`housemate ? null` just above), the `scene-now` label is not a household-news scene so `family-open` does not play, and a scene's talk "keeps to its occasion" (line 2291 to 2294), so nothing is said. Then line 2297's "hello and goodbye with nothing between" test is true for an empty list (`every` on no lines), so it returns a talk with no lines, no choices, no lies. The box then shows only Continue and Mark gap. (3) The room's rule passes no moment id, so it said "talkable" for the same person (1 line) while the scene's open gave 0.
Ruled out: the talkable rule writing anything (writes happen only in `say`, line 3175 to 3180, so the room's read does not use up topics); pulled or held lines (data/english/pulled.json, part-grades.json) were not involved: the same person gave a line without the moment id in the same world on the same day.
Probe (working copy only, undone): changing line 2231 to always call `bringItUp` made Apr 10 and May 15 open with 1 line (news) instead of 0; Dec 11 stayed 0 (without a moment its one line is `quiet`, the small-talk fallback, which an occasion talk does not use) and Oct 3 stayed 0 (nothing to say either way). So line 2231 explains some of the empty talks, and the missing guard in `showStory` explains all of them.

**Fix.** One rule: a talk with no line opens no box, on every road. (a) Make the scene's talk follow the same rule as the room: add a `talkable` read to the story route's answer (src/bench/story.ts, the `talkToId` field near line 228) computed with `openConversation(core, playerId, talkToId, { director, occasionId: momentId }).lines.length > 0`, and in `showStory` call `talkTo` only when it is true; otherwise end the scene as "the narrator alone is a Continue" (the branch right after it). Compute it in one helper shared with `sceneNow`, so the room and the scene cannot disagree. (b) Make `talkTo` in src/bench/play.mjs show no box when the reply has no lines, so no road (a scene, a room, a workplace visit) can open an empty one. Change nothing in `openConversation`: a scene's talk keeps to its occasion, and it must not borrow other news to fill the silence (the item director-no-borrowed-small-talk removes the hand-off from a scene to everyday talk altogether; if it is on main first, part (a) is already done and only (b) and the test are left). Write no line of text. If the director binds a scene to a person with nothing to say, name the situation type on the pull request for the words writer. No place is named in the fix; Rehoboth Beach is the labeled case for the test.

**Time box.** 3 hours for one Sonnet session at medium effort (one helper in handler.ts and story.ts, one guard in play.mjs, one test; the proof needs two 56-week runs of about 3 minutes each).

**Rules.** An effect is a read, not a record: the guard reads `openConversation` and writes nothing. No hand-written player text: no line is written in code. Ask why: the cause above is by file and line and by the drawn place's own ids. One engine per mechanic: the scene and the room use the one talkable read.

**Done when.** A second session starts a game in a drawn place it names with its seed, plays a year, and opens a talk with each member of the player's household, both by clicking them in the room and by playing each of the year's scenes with a housemate to its end: every talk that opens has a line, and a person with nothing to say opens no talk box. A test in a drawn place (in the style of src/bench/mark-gap.test.ts, naming the place and seed) plays 56 weeks and fails on any scene whose talk opens with no line.

**Waits on.** Nothing.

**Files.** src/bench/handler.ts, src/bench/story.ts, src/bench/play.mjs, src/director/conversation.ts, src/bench/talk-no-empty-box.test.ts (new)

**Notes.** Seen in Rehoboth Beach, Delaware (place key 1060290), seed dc376939-ac22-45ce-836f-5027c4f0799f, on main at 756370e86b: Patrick McCarthy, at home, on Jan 23, 2026, after a first talk with him on the first day. In the same run, pressing Hour after starting several dev mode scenes in a row from the Calendar's scene list gave "Player stop clock cannot cross an unresolved stop."; that may be a separate defect.

Cause found Nov 10, 2026 (cause finder, branch claude/cause-talk-no-line). Ran a throwaway bench test (not committed): `/api/newlife` at seed dc376939-ac22-45ce-836f-5027c4f0799f, place key 1060290, then 56 weeks of `/api/advance?mode=week`, comparing `/api/scene` talkable, `/api/talk/open` with and without a moment id, and `/api/story` talkToId. Still unknown: the second session's exact click (it said Patrick McCarthy at home on Jan 23, 2026; this run drew a different household and dates, so the person and day differ, the symptom is the same); whether visiting a workplace (src/bench/places.ts `visitPlace`, which draws coworkers with no talkable flag, so everyone is clickable there) also opens empty boxes, which the fix's `talkTo` guard covers; and the separate "Player stop clock cannot cross an unresolved stop." that was not seen here.

**Notes (Fable B's check, Nov 10).** Checked against main: `showStory` hands a scene to `talkTo(withId, momentId)` at src/bench/play.mjs line 2124 with no check; the room's rule in `sceneNow` (src/bench/handler.ts lines 205 to 222) passes no moment id; and `openConversation` returns an empty talk when its lines are empty, because `every` is true of no lines (src/director/conversation.ts near line 2297). The finder's second change, letting a scene's talk raise other news, is left out: it runs against the rule that a scene's talk keeps to its occasion and against director-no-borrowed-small-talk. Its probe is kept in the Cause as evidence only. Related: tests-conversation-farewell-no-talks found the same emptying in a test (a listener who remembers every topic opens an empty talk).

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:34 UTC) on branch claude/pool-play-talk-opens-with-no-line-after-a-year.
