---
id: play-calendar-jump-hangs-brookside-2025
title: "Go to this day stops answering on the way through Brookside, Delaware's first year"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of Lane 4 path 6 on main aa6bd01914: BENCH_SEED=4d50e1f88df997f9 BENCH_PLACE=1009850 BENCH_JUMP=2026-05-16 node src/bench/office-hours.browser.mjs (Brookside, Delaware's filing first opens May 15, 2026). The calendar jump stopped at a talk each time ('Your mother has news for you.', 'Your mother has something to tell you as soon as you're in the door.') and twice answered 400 'Answer the open choice or stop first.' even after Continue; after 'Robert Moran went to school with you all year, and wants a word before everyone scatters.' on Wednesday, June 11, 2025, the next request got no response in 600 seconds and the check died. The lane's builder saw the same in four runs (#7257). Path 6 (closed at night, visited next morning) can't be reached in Brookside.

**Rules.** Root cause in the advance or the talk that holds it; never shorten the jump or skip the scenes to reach the day. A stop is played as a player would (Continue, Leave, or an answer).

**Done when.** On main, BENCH_SEED=4d50e1f88df997f9 BENCH_PLACE=1009850 BENCH_JUMP=2026-05-16 node src/bench/office-hours.browser.mjs reaches May 16, 2026 in Brookside, Delaware, every request answering, and the filing office card says closed at night and opens the next morning; a test fails when an advance after a closed talk gets no answer.

**Files.** src/bench/office-hours.browser.mjs, src/bench/handler.ts, src/director/

**Notes.** TODO
