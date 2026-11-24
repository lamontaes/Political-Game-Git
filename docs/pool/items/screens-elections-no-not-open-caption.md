---
id: screens-elections-no-not-open-caption
title: "Elections shows no caption under a race that has not opened for filing"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The CTO, Nov 24 06:46Z, caught on Politics, Elections (Merizo) the caption Filing for this race has not opened yet under the Sim to Mar 8 button. A caption under a control breaks the Nov 8 no-subtext rule; the race dates and the Sim button already say it.
Seen: Politics, Elections, a race not yet open to file for, at 1440 by 900. Seen: Elections, a race before filing opens, with no caption under Sim, after. Guards: elections-no-caption.browser.mjs

**Cause.** Measured: `node src/bench/elections-no-caption.browser.mjs` against `npm run bench` on main fails "a caption says filing has not opened (row 0)" when the clerk answer for each race is window-not-open (an edge case made by hand); on drawn Ravenden, Arkansas the caption line shows with that answer. The Elections page in src/bench/play.mjs prints closedOfficeWords for a race with a bar and no announce, and window-not-open is one such bar.

**Fix.** Stop drawing the caption when the bar is window-not-open (the label stays: the server refusal message reads it); add elections-no-caption.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: the Nov 8 no-subtext rule forbids a caption under a control. No hand-written player text: the caption is removed, never reworded, and no label is added.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Elections on a race before its filing opens and sees its dates and its Sim button with no caption under them; elections-no-caption.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/elections-no-caption.browser.mjs (new)
