---
id: play-calendar-jump-hangs-brookside-2025
title: "Go to this day stops answering on the way through Brookside, Delaware's first year"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: opus
effort: high
root: rc2-done-from-records
---

**What.** Go to this day stops answering on the way through Brookside, Delaware's first year, which blocks anyone who jumps the calendar. A confirmer replay of Lane 4 path 6 on main (BENCH_SEED=4d50e1f88df997f9 BENCH_PLACE=1009850 BENCH_JUMP=2026-05-16 node src/bench/office-hours.browser.mjs; the filing first opens May 15, 2026) stopped at a talk each time ('Your mother has news for you.', 'Your mother has something to tell you as soon as you're in the door.'), twice answered 400 'Answer the open choice or stop first.' even after Continue, and after 'Robert Moran went to school with you all year, and wants a word before everyone scatters.' on Wednesday, June 11, 2025 the next request got no response in 600 seconds. The same failure shows in src/bench/calendar.browser.mjs, which fails 2 of 3 runs on main at e34de8c1ee in Papago, Northern Mariana Islands and La Madera, New Mexico, when a jump ends on chained stops: Continue stays visible but a click on it times out, or Week never becomes enabled. Path 6 (closed at night, visited next morning) cannot be reached in Brookside until this is fixed.

**Cause.** Measured: BENCH_SEED=4d50e1f88df997f9 BENCH_PLACE=1009850 BENCH_JUMP=2026-05-16 node src/bench/office-hours.browser.mjs (Brookside, Delaware) answers 400 'Answer the open choice or stop first.' after Continue, and the request after the Robert Moran talk on 2025-06-11 gets no response in 600 seconds; node src/bench/calendar.browser.mjs also fails 2 of 3 in Papago, Northern Mariana Islands and La Madera, New Mexico (e34de8c1ee). Which stop holds the advance is not found.

**Fix.** Find which stop holds the advance (the talk after a closed-at-night visit, or the chained stop after a scene) and why the next request is never answered, and fix it in the advance or the talk, in src/bench/handler.ts or src/director. Name the element or stop that blocked Continue by selector or record id. Never shorten the jump or loosen the check.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the fix is proven in a played world on the same place and seed, through the routes the Week control and the calendar call. Root cause in the advance or the talk that holds it; never shorten the jump or skip the scenes to reach the day, and a flaky browser check gets its cause fixed, not its check loosened (play-first skill). A stop is played as a player would (Continue, Leave, or an answer). Ask why: the PR names the stop that held the advance by record id.

**Done when.** A second session runs BENCH_SEED=4d50e1f88df997f9 BENCH_PLACE=1009850 BENCH_JUMP=2026-05-16 node src/bench/office-hours.browser.mjs on main and it reaches May 16, 2026 in Brookside, Delaware with every request answering, the filing office card saying closed at night and opening the next morning; it runs node src/bench/calendar.browser.mjs three times on a restarted bench in Papago, Northern Mariana Islands, La Madera, New Mexico and one more drawn place (names and seeds recorded), passing 3 of 3 each; a test fails when an advance after a closed talk gets no answer.

**Waits on.** Nothing.

**Files.** src/bench/office-hours.browser.mjs, src/bench/calendar.browser.mjs, src/bench/handler.ts, src/bench/play.mjs, src/director/

**Notes.** TODO
