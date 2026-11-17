---
id: screens-night-elsewhere-fits
title: "Election night's page of the races elsewhere fits the window, Close with it"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: screens lane (Nov 17)
pr:
blocked-on:
source: crew line item 4, the election night mock (pl-night, docs/mocks/2026-11-08-play), on the first-election path the CTO put first (Nov 17, 03:25Z); a repeat of the owner's Oct 27 audit
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** On election night, after the call, the page of the governor races elsewhere listed 35 states in one narrow column. It ran far past the bottom of the window, and Close sat below it, out of the player's reach. The owner's Oct 27 audit named the same fault ("rows past the panel's foot could not be reached").
Seen: Hampstead, Maryland, the night of Nov 3, 2026, on main.

**Cause.** Found in code: `src/bench/play.mjs`, `electionNight` never set the `nation` class on `#returns`, so the page's column rule in `src/bench/play.css` (`#returns.nation`) never applied; the other `#returns-*` rules styled the old returns screen, whose parts no longer exist.

**Fix.** The page sets its class; the races elsewhere span the board in three columns, one line each, so every state and Close fit the window at 1440 by 900 and 1024 by 768. The dead rules of the old returns screen are removed.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Screen to mock: sizes are named tokens in play.css and the page's markup stays in its ui part. Repeats become checks: the election-day check fails when any page of the night or its Next or Close runs past the window. Replace, never layer: the old returns rules go.

**Done when.** A second session votes in a drawn place, steps through election night to its last page and sees every state of the races elsewhere and Close inside the window, with a screenshot; the election-day check passes.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/play.mjs, src/bench/election-day.browser.mjs

**Notes.** Crew line #9747. The candidate's own night (the count by place, "I won", the opponent's call, what's next) is the rest of pl-night.
