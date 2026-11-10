---
id: play-opening-lands-at-830-pm
title: "After the President's address the game drops the player in a room at 8:30 p.m. with no line saying where or why (audit's New Hampshire life)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)")
---

**What.** Measured by the audit on Nov 9: "The opening still lands at 8:30 p.m." The audit's line gives no seed; its browser life was in Blodgett Landing, New Hampshire, a random world. The owner said it on Nov 8 at about 2:10 p.m. Eastern (v0.94.0): "I accidentally clicked skip intro, but that's fine. So then I show up somewhere randomly at 8:30 again." Read in code on main, Nov 10: `OPENING_EVENING_MINUTE` in `src/bench/opening.ts` (line 11) is 20 hours 30 minutes, `openingFrames` (line 21) hands it to the screen as the home's minute of the day, and `startLife` in `src/bench/play.mjs` (about line 6176) sets the clock from it and shows the room. The playtest check found that the landing follows the Oct 14 ruling (home after the address), "but no line says where or why, and Skip cuts straight to a room". So the defect is two things: a time typed into code, and an arrival with nothing told. Fix the cause: the hour comes from the opening's own records (when the address airs and the household is home), and the first thing on screen after the address, played or skipped, says the day, the place and who is there, through the scene opener every other scene already uses.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the arrival line comes from the English engine's day and arrival words through the one scene composer, never a sentence typed into the screen. Sliding scales and causes: the hour the player lands at follows from a record (the address's airing, the household's evening), not a fixed minute in code; if a fixed minute stays, it is a registered stopgap in the director's file. Owner, Nov 8, 2:10 p.m. (OWNER-DECISIONS, the playtest of v0.94.0): "If it's June 7th, it says first thing on June 7th. You head to the clerk's office and speak to Maria Patton. And then it starts like that." Owner, Oct 14: home after the address.

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof), and plays the opening twice: once through the address to its end, once clicking Skip. Each time it takes a screenshot of the first screen after the address. That screen must show one narration line that names the day as people say it and the place the player is in, and the clock on the player card must agree with the light in the room and with that line. It must not show a bare room with no line, an ISO date, or a time that the narration contradicts. The proof names the record the hour was read from. The same two runs are repeated in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro. The owner plays it: after the speech he is told where he is and when, and the hour makes sense for a household that just watched the address.

**Files.** src/bench/opening.ts, src/bench/handler.ts, src/bench/play.mjs, src/director/opening-story.ts, src/english/day-words.ts

**Notes.** From the audit's Pillar 6, re-checked in the game; playtest point P10 of docs/coordination/playtest/2026-11-08-1.md and its row in `2026-11-08-1-check.md` (Check A). `OPENING_EVENING_MINUTE` is read in four places in `src/bench/handler.ts` (lines 205, 1578, 1764, 1786). Related done item: words-scene-opens-day-place-person (every staged scene opens by naming the day, the place and the person; the landing after the address is not a staged scene, so it gets no such line). Related: play-journal-pop-up-appears-over-a-scene (filed Nov 10) touches the same lines of `startLife`. The conditionally approved Nov 8 play mocks themselves show the player card on the opening day reading "Monday, January 20, 2025" and "8:30 PM" (for example `docs/mocks/2026-11-08-play/renders/pl-journal.jpg`), so the hour alone matches a mock he approved; what the mock does not show is how the player gets there. Not verified by the audit: whether the owner's objection is to the hour itself or to arriving with nothing told; the check file reads it as the second, and this item fixes both without asking.
