---
id: news-city-and-county-ordinances-share-a-number-and-a-name-on-one-page
title: "The paper says 'the Budget Ordinance' failed and then that the mayor signed it: two bodies' Ordinance 2025-11 on one page"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** News on Sep 8, 2025 reads 'Vote on the Budget Ordinance comes up short / Ordinance 2025-11 failed on a vote of 3 to 4' and, below it, 'Christy Randall signs Ordinance 2025-11, the Budget Ordinance'. They are two bills: the county board's Ordinance 2025-11 failed, and the city council's Ordinance 2025-11 passed 3 to 2 and the mayor signed it. Only the failed story names its body. Both were introduced Aug 4. Seen: the News front page and its TV outlets.

**Cause.** Found in code: each body numbers its own ordinances, as real bodies do, and both budget bills are named 'Budget Ordinance' (billNameOf, src/english/bill-names.ts, line 109). The signing story's facts carry level 'city' and executiveId but its headline and lede name no body (printed executive-action for bill:office:gus2025:190194:council:2025-08-04:person_25a4a36657457ffe:39). Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); county bill:office:gus2025:126541:board:2025-08-04:person_1803dc640e5ad6db:40.

**Fix.** A town paper's ordinance stories name the body ('the City Council's Budget Ordinance', 'the county board's') whenever the place has more than one local body that numbers ordinances. The words come from the Words session's news bank and need Fable A's read.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code; the wording is the Story session's. Ask why: each story cites its own bill record.

**Done when.** A second session plays a year on main in a drawn town with both a council and a county board, named with its seed, and every ordinance story on News names the body that acted, with no two stories on one page sharing a number; a test on the namer covers a city and a county ordinance passed the same week.

**Waits on.** Fable A's read of the new body words (Words session).

**Files.** data/english/parts/news.json, src/bench/printed-words.ts
