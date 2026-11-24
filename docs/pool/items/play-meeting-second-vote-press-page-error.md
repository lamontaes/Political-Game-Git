---
id: play-meeting-second-vote-press-page-error
title: 'A second quick press of Yes at a meeting raises "That item is not waiting on this agenda." as a page error'
area: play
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/pool-play-meeting-second-vote-press-page-error
pr: #8869
after:
blocked-on:
source: Fable B's walk as a council member, Nov 11, 2026 (Lino Lakes, Minnesota, seed 046d2235-27df-4daa-a680-423d6f24d0d7, the meeting of February 4, 2025); written by P1 at Fable B's word
lead: screens
standard: 2
model: sonnet
effort: medium
root: none
merged-at: 2026-11-11T23:27:40.783Z
---

**What.** At a council meeting, a player who presses Yes twice quickly on an item (a double-click) votes once, then the second press reaches the server after the item was taken up and the page throws "That item is not waiting on this agenda." as an uncaught page error. Replayed on main in Lino Lakes, Minnesota (bench seed `046d2235-27df-4daa-a680-423d6f24d0d7`, Advanced as council member Astrid Shelton): Budget Ordinance 2025-1 enacted 3 to 2, and the page error. Seen: the meeting panel, any item's Yes, No, Abstain, Decide for me, Speak for or Speak against.

**Cause.** Found in code: `inMeeting` in src/bench/play.mjs wires each meeting button straight to `draw(await post(...))`. Nothing stops a second press before the panel redraws, so the same vote is posted again; the meeting engine refuses an item no longer waiting (src/core2/modules/office-day.ts, "That item is not waiting on this agenda."), `api` throws the refusal, and nothing catches it.

**Fix.** In `inMeeting`, one `act` for every button on the panel: every button is off from the press until the panel redraws from the server's answer, and a refusal redraws the meeting as it stands with the server's line at its top (`prose(..., "meeting-note")`), never thrown. Adjourn is off from its press too. A browser check presses Yes twice without waiting and sees one vote of the player's, the result and no page error.

**Time box.** 1 hour.

**Rules.** No hand-written player text: the refusal shown is the engine's own line. One rule, all 56 places: the check draws its place unless a seed is given and names it.

**Done when.** A second session, on main, steps in as a member of a local body (Advanced) in a drawn place named with its seed, reaches the body's meeting, double-clicks Yes on an item and sees the item's result with the player's vote once and no page error; `src/bench/meeting-double-vote.browser.mjs` passes against a fresh bench.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs (`inMeeting`), src/bench/meeting-double-vote.browser.mjs (new)
