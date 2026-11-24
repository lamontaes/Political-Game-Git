---
id: screens-pick-row-keeps-name-whole
title: "A list row with a long name keeps its words whole and sends its aside under it"
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #10356
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
merged-at: 2026-11-24T06:45:47.356Z
---

**What.** The owner, Nov 16 (N16-58), said: it is squished right here. On Politics, Elections a ballot office such as Council member (District 2) - County office broke down to a word or less a line beside its Filing opens aside.
Seen: Politics, Elections, the offices list at 1440 by 900. Seen: Elections offices list, aside under the name, after. Guards: pick-row-wrap.browser.mjs

**Cause.** Measured: `node src/bench/pick-row-wrap.browser.mjs` against `npm run bench` on main c2c6c0f6 fails "the name takes 4 lines"; on a drawn Coker Creek, Tennessee the offices were 5 and 4 lines at 81 px. The .pick rule in src/bench/play.css keeps name and aside on one flex line and breaks the name with overflow-wrap: anywhere.

**Fix.** Let .pick rows wrap so the aside drops under a long name, and break words only when one cannot fit; add pick-row-wrap.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK lists a name with its aside and never squeezes either. No hand-written player text: no new label is added; the row words are untouched.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Elections and sees each office name on at most two lines with its aside under it; pick-row-wrap.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.css,src/bench/pick-row-wrap.browser.mjs (new)
