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
after:
blocked-on:
standard: 2
lead: words
model: opus
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** On a January 20, 2025 first paper, the fresh stories (within the news engine's `newsMaxAgeDays`) are only laws enacted, laws taking effect and legislative votes. In Knik River, Alaska (seed briefs-nov2:1) the 9 fresh stories are of two kinds, law-took-effect and law-enacted. The opening day's own records (the inauguration, a legislature convening, a county board's first January meeting) do not reach the paper as stories. Write those records so the press desk prints them as ordinary stories dated within the window. Seen: the first paper on opening day, with the inauguration, legislatures convening and January meetings.

**Cause.** Needs cause. Looked at: `GOLDEN_PATH_SEED=briefs-nov2:1 npx vitest run src/bench/paper-fresh.test.ts` draws Knik River, Alaska and gives 9 fresh stories of only law-took-effect and law-enacted kinds. Not traced: which inauguration, session and meeting records exist and what they are dated.

**Fix.** None until the cause is found.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: fresh news comes from records, never filler (words-opening-paper-only-fresh-news), and the record is printed by the press desk the same way as every other story. One rule, all 56 places: no state or city is named in logic.

**Done when.** A second session (not the builder) opens the first paper in three drawn places (named with seeds, the first Knik River, Alaska, seed briefs-nov2:1) and finds at least six fresh stories of at least three record kinds, each citing a record dated within `newsMaxAgeDays`, with a screenshot of each paper at 1440x900; `src/bench/paper-fresh.test.ts` passes in those places.

**Waits on.** Governing records from the gov lead for inaugurations and sessions (named in the Notes).

**Files.** src/core2/press-desk.ts, src/core2/past-news.ts, src/bench/paper-fresh.test.ts, src/core2/modules/news.ts

**Notes.** Filed by Lane 3 (Nov 4) from words-opening-paper-only-fresh-news, under agreements/3-4.md. Needs from others: lead gov (Lane 1). Lane 3 reads the story; the record is Lane 1's.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Knik River, Alaska replay, list the records dated the opening day and the first weeks of January by kind, and mark which of the inauguration, the legislature convening and the January meetings exist. For each that is missing, name the governing engine that should write it. The fix then has those engines write the records and the press desk read them, with no story typed in.
