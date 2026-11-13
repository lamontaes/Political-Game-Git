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
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** On a January 20, 2025 first paper, the fresh stories (within the news engine's `newsMaxAgeDays`) are only laws enacted, laws taking effect and legislative votes. In Knik River, Alaska (seed briefs-nov2:1) the 9 fresh stories are of two kinds, law-took-effect and law-enacted. The opening day's own records (the inauguration, a legislature convening, a county board's first January meeting) do not reach the paper as stories. Write those records so the press desk prints them as ordinary stories dated within the window. Seen: the first paper on opening day, with the inauguration, legislatures convening and January meetings.

**Cause.** Measured: `GOLDEN_PATH_SEED=briefs-nov2 npx vitest run src/bench/paper-fresh.test.ts` on main 061eda78 gives Knik River, Alaska (0240670, seed briefs-nov2:1) 11 fresh stories of 2 kinds on 2025-01-20. The January records are written and printed; they reach the player two days after the first paper. With a probe outside the repository, the same world's log holds, dated 2025-01-20 and public: `inauguration:2025-01-20`, 7 `official-appointed` (for example appointed:appointment:town:police-chief:2025-01-20) and 14 `budget-line-changed`. All 22 are stories in the news module's `stories` table. Found in code: the first paper is `heardItems` in src/bench/calendar.ts (line 292), which lists only `storiesHeard` for the player. The player's copy of each of those 22 stories sits in the news module's `deliveries` table dated 2025-01-22, because `scheduleDeliveries` (src/core2/modules/news.ts, about line 513) holds every reader's copy for their own `readingDelay` (line 497: the outlet's delay over the reader's engagement and trust). So on the paper's own night the player has heard only the 11 archived law stories. Two more public records of that day, `chamber-organized:federal:us-house:2025-01-20` and `president.address:2025-01-20`, never became stories; the paper does not need them to meet this item. Knik River has no town government and the Alaska Legislature convenes on Jan 21, so nothing else in the window was due.

**Fix.** Make the night's paper show the edition in the player's house, read-only. In `heardItems` (src/bench/calendar.ts), a story dated within `freshSince` whose delivery to the player is still waiting (the news module's `deliveries` row `${story.id}:${playerId}`) is listed as fresh, beside what the player has heard. Add a small reader in src/core2/modules/news.ts for that lookup (the table has the id; no scan). Opening the paper writes nothing and spends no time, so the player still hears each story on the day the news engine says. Change no record, delay or parameter, and type no story. Before building, ask the session that owns the opening's paper (docs/coordination/CREW.md) whether it already has this; the opening's words are held by other sessions. Extend src/bench/paper-fresh.test.ts to count the fresh kinds and print them.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: fresh news comes from records, never filler (words-opening-paper-only-fresh-news), and the record is printed by the press desk the same way as every other story. One rule, all 56 places: no state or city is named in logic.

**Done when.** A second session (not the builder) opens the first paper in three drawn places (named with seeds, the first Knik River, Alaska, seed briefs-nov2:1) and finds at least six fresh stories of at least three record kinds, each citing a record dated within `newsMaxAgeDays`, with a screenshot of each paper at 1440x900; `src/bench/paper-fresh.test.ts` passes in those places.

**Waits on.** Nothing. The inauguration and the day's appointments are already written as records.

**Files.** src/bench/calendar.ts, src/core2/modules/news.ts, src/bench/paper-fresh.test.ts

**Notes.** Filed by Lane 3 (Nov 4) from words-opening-paper-only-fresh-news, under agreements/3-4.md. Needs from others: lead gov (Lane 1). Lane 3 reads the story; the record is Lane 1's.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Knik River, Alaska replay, list the records dated the opening day and the first weeks of January by kind, and mark which of the inauguration, the legislature convening and the January meetings exist. For each that is missing, name the governing engine that should write it. The fix then has those engines write the records and the press desk read them, with no story typed in.

Nov 11 (cause finder for Fable B): reproduced in Knik River and traced with a probe outside the repository. The records the item asked for now exist and become stories, but the player's copy of each is delivered on Jan 22 by their own reading delay, and the first paper shows only what the player has heard. The fix shows the copies already on their way, without writing anything.
