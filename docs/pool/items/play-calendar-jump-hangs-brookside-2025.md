---
id: play-calendar-jump-hangs-brookside-2025
title: "Go to this day is offered while a stop is open, and the browser checks click through it"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: account-lead-t29
pr: 9062
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: medium
root: rc2-done-from-records
checked: fable 2026-11-10
---

**What.** Go to this day stops answering on the way through Brookside, Delaware's first year, which blocks anyone who jumps the calendar. A confirmer replay of Lane 4 path 6 on main (BENCH_SEED=4d50e1f88df997f9 BENCH_PLACE=1009850 BENCH_JUMP=2026-05-16 node src/bench/office-hours.browser.mjs; the filing first opens May 15, 2026) stopped at a talk each time ('Your mother has news for you.', 'Your mother has something to tell you as soon as you're in the door.'), twice answered 400 'Answer the open choice or stop first.' even after Continue, and after 'Robert Moran went to school with you all year, and wants a word before everyone scatters.' on Wednesday, June 11, 2025 the next request got no response in 600 seconds. The same failure shows in src/bench/calendar.browser.mjs, which fails 2 of 3 runs on main at e34de8c1ee in Papago, Northern Mariana Islands and La Madera, New Mexico, when a jump ends on chained stops: Continue stays visible but a click on it times out, or Week never becomes enabled. Path 6 (closed at night, visited next morning) cannot be reached in Brookside until this is fixed.

**Cause.** Measured: the hang does not reproduce on the train. Server-side jumps with every stop resumed and the polls left on election day answered every request: Brookside, Delaware (1009850, seed 4d50e1f88df997f9, to 2026-05-16: 22 stops, longest request 25 s, 233 s in all; the Robert Moran stop on 2025-06-11 resumed in 0.2 s), East Valley, Nevada (seed aa11bb22cc33dd44, to 2027-01-05 across two year ends and the Nov 2026 election: 111 s) and El Adobe, California (seed 7e5f01a9b2c4d6e8, same jump: 143 s). A jump is slow by what plays on the way (about 2 to 8 s per jumped month, the played-year cost), not stuck. What does happen: the calendar offered Go to this day while a stop was open, and the server refused it (400, "Answer the open choice or stop first."; the page then takes the stop back and shows Continue, or else prints the server's refusal on the card's place line). The browser check pressed it through stops and gave up after a fixed 3 seconds. The page now draws no Go to this day while a stop is open (`offersJump` in src/bench/ui/calendar.mjs, `held` from play.mjs) and the checks wait on the server's answers. Found in code: src/bench/ui/calendar.mjs `calendarScreen` drew Go to this day whatever the packet, while src/bench/player.ts `advance` refuses a jump with a stop open.

**Fix.** 1. In src/bench/play.mjs, pass `open: packet?.kind === "stop"` (or the packet) to `calendarScreen`, and in src/bench/ui/calendar.mjs do not draw the Go to this day button while a stop is open, the same rule that disables Week; the day's list still shows. Do not change player.ts: refusing is right. 2. In src/bench/office-hours.browser.mjs and src/bench/calendar.browser.mjs, make `leaveScenes` wait on the server, not a fixed 3 seconds: after clicking an exit, wait for that request's `/api/resume` or `/api/advance` response and for `#talk`, `#continue` or `#election-day` to settle, and click a located button only through Playwright's own click (no count-then-click). Treat a visible `#continue` on the card as a scene to leave before choosing a day. 3. Add a check to src/bench/calendar.browser.mjs: with a stop open, the calendar shows no Go to this day button.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the fix is proven in a played world on the same place and seed, through the routes the Week control and the calendar call. Root cause in the advance or the talk that holds it; never shorten the jump or skip the scenes to reach the day, and a flaky browser check gets its cause fixed, not its check loosened (play-first skill). A stop is played as a player would (Continue, Leave, or an answer). Ask why: the PR names the stop that held the advance by record id.

**Done when.** A second session runs BENCH_SEED=4d50e1f88df997f9 BENCH_PLACE=1009850 BENCH_JUMP=2026-05-16 node src/bench/office-hours.browser.mjs on main and it reaches May 16, 2026 in Brookside, Delaware with every request answering, the filing office card saying closed at night and opening the next morning; it runs node src/bench/calendar.browser.mjs three times on a restarted bench in Papago, Northern Mariana Islands, La Madera, New Mexico and one more drawn place (names and seeds recorded), passing 3 of 3 each; a test fails when an advance after a closed talk gets no answer.

**Waits on.** Nothing.

**Files.** src/bench/office-hours.browser.mjs, src/bench/calendar.browser.mjs, src/bench/handler.ts, src/bench/play.mjs, src/director/

**Notes.** TODO

**Notes (Fable's check, Nov 10).** How to find the cause: Find which stop holds the advance (the talk after a closed-at-night visit, or the chained stop after a scene) and why the next request is never answered, and fix it in the advance or the talk, in src/bench/handler.ts or src/director. Name the element or stop that blocked Continue by selector or record id. Never shorten the jump or loosen the check.

Cause found (Nov 11, 2026, cause finder for Fable B): ran the check twice on main b957363c with a fresh bench, the second time with `leaveScenes`'s wait raised to 20 seconds in a working copy (undone after). The first run failed at the Calendar ring after the Cynthia Sherman stop. The second reached the item's 400s: each Go to this day was pressed while a stop was pending, and the calendar offered it. Screenshots of each jump showed the stop's talk opening a moment after the jump was refused.
