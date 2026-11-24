---
id: screens-news-panel-fits-content
title: "The News panel ends under its content instead of leaving its lower half empty"
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

**What.** The CTO, Nov 24 06:46Z, caught that the lower half of the News panel is empty (Bloomsbury and Roaring Spring). News took the whole window by design, so a short list of headlines and one story left the rest of the panel blank, the dead space the owner has ruled out since Oct 27.
Seen: News at 1440 by 900. Seen: News, a panel that ends under its headlines and story, after. Guards: news-panel-fits.browser.mjs

**Cause.** Measured: `node src/bench/news-panel-fits.browser.mjs` against `npm run bench` on main fails "the News panel has 244px empty under its content" (and 129px) on drawn places. openSheet in src/bench/play.mjs lists news among the screens that take the window (the fits class is withheld), so the panel is full height whatever it holds.

**Fix.** Remove news from that list so the sheet fits its content up to the window height, its two columns still scrolling inside themselves when a paper has many headlines; add news-panel-fits.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK says no dead space, so the panel fits its content and nothing is empty below. No hand-written player text: no new label is added; only the panel height changes.

**Done when.** A second session, in a drawn place and seed it names, opens News in a life with one or two headlines and sees the panel end under its content; news-panel-fits.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/news-panel-fits.browser.mjs (new)
