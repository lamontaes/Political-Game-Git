---
id: play-news-date-line-reads-the-start-date
title: "The News paper's date line reads the day the life began, not today (Rock Cave, West Virginia, seed rockcave-a)"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: none
source: "F5 carry #9317 check, Nov 15"
claimed-at:
checked:
---

**What.** On News, the heading's date line shows the day the life started while the stories under it are months later. Show the world's current date. Seen: the News screen's date line under the outlet heading.

**Cause.** Needs cause. Measured: Rock Cave, West Virginia (place key 5469244, world seed rockcave-a), `node src/bench/states.browser.mjs` at head 15b289d4 after 240 days plus 56 more, dev mode run-until: the Nation heading reads `Monday, January 20, 2025` above a story dated `November 6` that opens a roll call dated `November 6, 2025` (the world date then is 2025-11-12). Looked at: `src/bench/play.mjs` passes `date: today()` to `newsBoard`, and `today` (line 149) is `packet?.at?.date ?? me.date`; I did not confirm which of the two is stale on this screen or why (a stale player card after dev mode's run-until, or a packet with no date).

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes and set the state honestly with a one-line note.

**Rules.** A view of the one record: the date comes from the same place every other screen reads (`player-screen-text`); nothing new is stored.

**Done when.** A second session, on main, plays the same world (Rock Cave, West Virginia, seed rockcave-a) 296 days in dev mode, opens News, and sees the date line equal the calendar's date; the bench check names the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/news-board.mjs

**Notes.** Filed by F5; the second words reader saw it on the #9317 screens.
