---
id: screens-ballot-fits-window
title: "A long ballot fits the window: the races scroll, What I know and Leave stay on screen"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: screens lane (Nov 17)
pr:
blocked-on:
source: crew line item 4, the ballot mock (pl-ballot, docs/mocks/2026-11-08-play), on the first-election path the CTO put first (Nov 17, 03:25Z)
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** A ballot with a county's offices and several commissioners ran past the bottom of the window: the paper grew with every race, "What I know about them" scrolled away with it, and Leave sat below the last race. Each mark redrew the paper from its top.
Seen: election day in Hampstead, Maryland, on main, 22 races on the ballot.

**Cause.** Found in code: `src/bench/play.css`, the `#ballot` panel had no height cap and `.ballot-sheet` no scroll of its own, so the whole panel took the paper's height; `src/bench/ui/ballot-paper.mjs` put Leave at the end of the sheet; `atThePolls` in `src/bench/play.mjs` replaced the paper on each mark without keeping its scroll.

**Fix.** The panel is capped at a named height token; the races scroll in their own column beside "What I know about them"; Leave stands in a foot under the races, as the mock's foot holds its button; a mark keeps the races scrolled where the voter was.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Screen to mock: markup stays in the ui part and sizes are named tokens in play.css. No hand-written player text: every label is the polling controls' own. Replace, never layer: Leave moves out of the sheet, not copied.

**Done when.** A second session goes to vote in a drawn place with a long ballot and sees the ballot inside the window, "What I know about them" beside the races and Leave under them, and a mark far down the ballot leaves the races where they were.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/play.mjs, src/bench/ui/ballot-paper.mjs, src/bench/election-day.browser.mjs

**Notes.** Crew line #9747. Election night (pl-night) is the next screen on the path.
