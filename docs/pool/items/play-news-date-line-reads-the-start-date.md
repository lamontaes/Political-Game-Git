---
id: play-news-date-line-reads-the-start-date
title: "The News paper's date line reads the day the life began, not today (Rock Cave, West Virginia, seed rockcave-a)"
area: play
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by:
pr: #9371
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

**Cause.** Found in code: the screen keeps its own copy of the game's date (`packet?.at` in `src/bench/play.mjs`), set only when a time button returns a packet. A dev panel's run of days (`src/bench/dev-mode.ts` `advance`) lets the character go (`BenchPlayer.release()` clears the server's packet) and returns no packet, so the card had no clock to show and `today()` and the card clock kept the old day. Measured: Rock Cave, West Virginia (place key 5469244, seed rockcave-a), the dev panel's Run said 2025-01-20 to 2025-02-19 and the card clock still read "Monday, January 20, 2025". Every `today()` reader (News, the elections pages, the Calendar's day titles) had the same fault.

**Fix.** `/api/card` carries `at` (the player's clock while it runs, else the world's day at 12:00 AM); the screen keeps one `clockAt`, set from a packet or the card, which `today()` and the card clock read. `src/bench/dev-run-date.browser.mjs` (Rock Cave, seed rockcave-a) fails before and passes after.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes and set the state honestly with a one-line note.

**Rules.** A view of the one record: the date comes from the same place every other screen reads (`player-screen-text`); nothing new is stored.

**Done when.** A second session, on main, plays the same world (Rock Cave, West Virginia, seed rockcave-a), runs days with the dev panel on the Calendar, and sees the card clock and the News date line equal the day the run reached; the bench check names the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/news-board.mjs

**Notes.** Filed by F5; the second words reader saw it on the #9317 screens.
