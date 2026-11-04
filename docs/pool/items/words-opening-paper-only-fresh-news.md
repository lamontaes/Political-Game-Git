---
id: words-opening-paper-only-fresh-news
title: "The first paper prints only news fresh on its date, with enough January news to fill a page"
area: words
kind: bug
priority: 2
size: M
status: claimed
claimed-by: lane3/paper-fresh
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T04:31:39.010Z
---

**What.** The first paper lists every story the player heard in the year before day one, newest first, so its foot carries votes and races from months before the paper's date as if they were today's news. On a January 20, 2025 paper in Peck, Idaho (seed briefs-nov2:2), after words-paper-law-and-budget-briefs-read-right keeps laws and budgets to the days a story stays news, the foot reaches back to county board votes of January and February 2024. Measured on main in six drawn places (seeds briefs-nov2:0-2, front-nov2:0-2): of 28 or 29 worded stories, only 5 to 12 are within the news engine's newsMaxAgeDays (30) of the opening, and most of those were laws that changed nothing, so the general rule would leave Mahinahina, Hawaii and Yaurel, Puerto Rico with no story at all.

**Rules.** An effect is a read, not a record: the paper reads each story's age from the news engine and keeps no list of its own. Realistic not real: only news fresh on the paper's date prints (owner's Nov 1 playtest). News has an archive so the news screen is not empty on day one (OWNER-DECISIONS, Oct 14). One rule for every kind, read from the news engine's own age (no new cutoff). Fresh news comes from records (the inauguration, legislatures convening, January meetings and filings), never filler.

**Done when.** In three drawn places (named with seeds), the first paper carries no story older than newsMaxAgeDays, holds at least six stories of at least three kinds, and every story names a record dated within the window; the PR quotes the front page and its foot before and after.

**Files.** src/bench/calendar.ts, src/core2/past-news.ts, src/core2/modules/press.ts

**Notes.** Filed by Words, scenes and the director from words-paper-law-and-budget-briefs-read-right (Nov 2). Needs from others: the press or governing line for fresh January records (a legislature convening, the inauguration as a news record) if the archive has none in a place.
