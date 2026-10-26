---
id: play-continue-hides-first-night-news
title: "Continue on the opening evening hides the first-night news on the table"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: play-first/play-continue-hides-first-night-news
pr: #6155
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-26T07:07:19.114Z
---

**What.** In Juntura, Oregon, seed bb88a211-1ebd-485d-9dea-d6955997be7d, the opening creates the first-night news with national and regional unemployment lines. Reloading that same life and choosing Continue at the same opening-evening date leaves the news surface hidden, so its reader cannot be opened from the table. The kept opening API still contains the regional sentence and the quoted address. The surface is shown only by the fresh-life path, while Continue refreshes the room without restoring it; this was observed while reviewing a test-only PR whose runtime is unchanged from main.

**Rules.** Wire to the world: Continue must read the kept opening-news records and restore their existing reader without advancing the date or inventing news. One rule, all 56 places: prove this on a fresh drawn place and keep the named observed seed as a regression beside it.

**Done when.** In a fresh drawn place with seed named, open the first-night reader, reload the same life and choose Continue, then open that reader again at the unchanged date. A browser test positively checks that the news surface and both kept rate sentences are present, with native before and after screenshots and matching record-derived text; no forced clicks or synthetic news are used.

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/bench/rates-named.browser.mjs

**Notes.** Merger 1, Oct 26 04:05 UTC, found during #6105 review. The fresh Palmyra VA browser flow works; continuing the existing Juntura life keeps #news-surface hidden. Runtime source is main 050736344b62eeae4093e66bc7b673e049bf847c; #6105 changes tests and screenshots only. No installed-build check claimed.

**Time box.** 2 hours; push the bounded repair and browser evidence.

**You will see.** Continue on the opening evening keeps the same news available on the table.

**Screenshot.** Native 1440 by 900 before and after, from the drawn world, named with its seed.
