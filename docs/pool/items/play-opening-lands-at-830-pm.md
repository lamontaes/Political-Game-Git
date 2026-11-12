---
id: play-opening-lands-at-830-pm
title: "After the President's address the game drops the player in a room at 8:30 p.m. with no line saying where or why (audit's New Hampshire life)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #8647
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)")
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-play-opening-lands-at-830-pm
---

**What.** The audit measured on Nov 9 that "the opening still lands at 8:30 p.m.", with no line saying where or why (its browser life was in Blodgett Landing, New Hampshire, no seed given). The owner said it on Nov 8 at about 2:10 p.m. (v0.94.0): "I accidentally clicked skip intro, but that's fine. So then I show up somewhere randomly at 8:30 again." The playtest check found the landing follows the Oct 14 ruling (home after the address), but no line says where or why and Skip cuts straight to a room. The defect is two things: a time typed into code, and an arrival with nothing told. The hour should come from the opening's own records, and the first screen after the address, played or skipped, should say the day, the place and who is there through the scene opener every other scene uses.

**Cause.** Found in code: `OPENING_EVENING_MINUTE` in src/bench/opening.ts (line 11) is 20 hours 30 minutes, `openingFrames` hands it to the screen as the home's minute of the day, it is read in four places in src/bench/handler.ts (lines 205, 1578, 1764, 1786), and `startLife` in src/bench/play.mjs sets the clock from it. The landing is not a staged scene, so no opener line plays.

**Fix.** Read the arrival hour from the opening's own records (the address airing, the household home) instead of the constant, and after the address (played or skipped) show one narration line naming the day as people say it and the place, through the one scene opener (src/director/opening-story.ts, src/english/day-words.ts). Any fixed minute that stays is a registered stopgap in the director's file.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the arrival line comes from the English engine's day and arrival words through the one scene composer, never a sentence typed into the screen. Sliding scales and causes: the hour the player lands at follows from a record, not a fixed minute in code. Owner, Oct 14: home after the address.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and plays the opening twice, once through the address to its end and once clicking Skip, taking a screenshot of the first screen after the address each time. That screen shows one narration line naming the day and the place, and the clock on the player card agrees with the light in the room and with that line. It shows no bare room with no line, no ISO date, and no time the narration contradicts, and the proof names the record the hour was read from. The two runs are repeated in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro.

**Waits on.** Nothing.

**Files.** src/bench/opening.ts, src/bench/handler.ts, src/bench/play.mjs, src/director/opening-story.ts, src/english/day-words.ts

**Notes.** From the audit's Pillar 6, re-checked in the game; playtest point P10 of docs/coordination/playtest/2026-11-08-1.md and its row in `2026-11-08-1-check.md` (Check A). `OPENING_EVENING_MINUTE` is read in four places in `src/bench/handler.ts` (lines 205, 1578, 1764, 1786). Related done item: words-scene-opens-day-place-person (every staged scene opens by naming the day, the place and the person; the landing after the address is not a staged scene, so it gets no such line). Related: play-journal-pop-up-appears-over-a-scene (filed Nov 10) touches the same lines of `startLife`. The conditionally approved Nov 8 play mocks themselves show the player card on the opening day reading "Monday, January 20, 2025" and "8:30 PM" (for example `docs/mocks/2026-11-08-play/renders/pl-journal.jpg`), so the hour alone matches a mock he approved; what the mock does not show is how the player gets there. Not verified by the audit: whether the owner's objection is to the hour itself or to arriving with nothing told; the check file reads it as the second, and this item fixes both without asking.

Released (2026-11-11): Needs an arrival line from the English engine; no existing bank line is named for the landing after the address, and new lines under data/english/parts/ belong to the Story session (to list: one arrival line naming the day, the place and who is home, for both the played and the skipped address). The hour change (src/bench/opening.ts OPENING_EVENING_MINUTE read from the address airing) is buildable once that line exists. Continue on branch claude/pool-play-opening-lands-at-830-pm.

Sent back 2026-11-12 from PR #8647 (branch claude/pool-play-opening-lands-at-830-pm): typecheck fails on the merged tree — src/bench/handler.ts lines 600-601 still read OPENING_EVENING_MINUTE after the import was removed; replace those two reads with openingArrivalMinute (author decides the opening-day talk clamp), rerun typecheck, and re-prove the named seeds on the new head. The light-clock done-when row stays open: flip the PR line to Touches pool item until the room light follows the arrival hour.
