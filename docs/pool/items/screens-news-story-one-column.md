---
id: screens-news-story-one-column
title: "A news story's text is one column, not two"
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

**What.** The CTO caught (C16) on the owner Nov 23 playtest that the news story last sentence floats in a second column (It reaches everyone in New Jersey.). The lead story on the News screen is set in two columns even when it is one or two short paragraphs.
Seen: News, the lead story at 1440 by 900. Seen: News, the lead story in one column, after. Guards: news-one-column.browser.mjs

**Cause.** Measured: `node src/bench/news-one-column.browser.mjs` against `npm run bench` on main 2b7b3b28 fails "the lead story is set in columns" on two drawn places. The rule `.news-story.lead .news-text { column-count: 2 }` in src/bench/play.css splits a short lead into two columns.

**Fix.** Delete the column-count and column-gap rule and the break-inside rule that served it from play.css; add news-one-column.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK, no pasted-on layouts. No hand-written player text; no label added.

**Done when.** A second session, in a drawn place and seed it names, opens News and sees the lead story as one column with every sentence on the same left edge; news-one-column.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.css,src/bench/news-one-column.browser.mjs
