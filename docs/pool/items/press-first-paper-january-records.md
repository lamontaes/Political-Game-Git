---
id: press-first-paper-january-records
title: "January's own records reach the first paper: the inauguration, legislatures convening, January meetings"
area: gov
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a January 20, 2025 first paper, the fresh stories (within the news engine's newsMaxAgeDays) are only laws enacted, laws taking effect and legislative votes. In Knik River, Alaska (paper-fresh.test.ts, GOLDEN_PATH_SEED=briefs-nov2:1) the 9 fresh stories are of two kinds, law-took-effect and law-enacted. The opening day's own records (the inauguration, a legislature convening, a county board's first January meeting) do not reach the paper as stories.

**Rules.** Fresh news comes from records, never filler (words-opening-paper-only-fresh-news). One rule for every place: no state or city named in logic. Wire to the world: the record is printed by the press desk the same way as every other story.

**Done when.** In three drawn places named with seeds, the first paper on the opening date holds at least six fresh stories of at least three record kinds, each citing a record dated within newsMaxAgeDays, shown by src/bench/paper-fresh.test.ts.

**Files.** src/core2/press-desk.ts, src/core2/past-news.ts, the governing records that write inaugurations and sessions

**Notes.** Filed by Lane 3 (Nov 4) from words-opening-paper-only-fresh-news, under agreements/3-4.md. Needs from others: lead gov (Lane 1). Lane 3 reads the story; the record is Lane 1's.
