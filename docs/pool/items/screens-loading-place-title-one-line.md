---
id: screens-loading-place-title-one-line
title: "The place title on the loading card stays on one line"
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

**What.** The owner, Nov 23 (P31), said: it is the same thing with the city and state on the loading screen. The card is 400 px wide, so a place like Los Altos, Texas wraps its title onto two lines.
Seen: the loading card at the top left of the title screen at 1440 by 900 while a new world loads. Seen: the loading card top left, title on one line, after. Guards: loading.browser.mjs

**Cause.** Measured: `node src/bench/loading.browser.mjs` against `npm run bench` on main 2b7b3b28, with the new assertion, fails "1440x900: the place title wraps" for Storrs, Connecticut. The .menu rule in src/bench/play.css fixes the card at width 400px with 28px padding, leaving 340px, and #front.loading adds no width or nowrap rule.

**Fix.** In src/bench/play.css give #front.loading width max-content with min-width 400px and white-space nowrap on its title; add the one-line assertion to loading.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock. No hand-written player text; no label added.

**Done when.** A second session, in a drawn place and seed it names, starts a new world and sees the place title on one line on the loading card; loading.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.css,src/bench/loading.browser.mjs
