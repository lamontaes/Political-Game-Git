---
id: director-school-finished-never-stages
title: "The last school day and the diploma at home never stage for the new adult in a played year"
area: director
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr: #6712
blocked-on:
source: "scenes finisher, Oct 27 21:50 UTC, building the lines for the director's school-finished producer (#6373)"
lead: director
milestone: play-first
claimed-at:
---

**What.** The school-finished producer (#6373) reads the school engine's graduation result and should stage `last-day` with a classmate on the day and `diploma-home` (or `celebration` on main) the day after when the player graduated. In four drawn places played through the player clock (seed `school-1`, `src/director/school-goodbye-scene.test.ts` on branch `finisher/school-last-day`), neither ever staged. In Cotter, Arkansas the school engine wrote the player's result row `school.graduation-pct:person_c07b53f642400eb1:2024` on June 3, 2025 (passed false), and the director's schedule held no `circumstance:school-last-day` moment after 160 days.

**Rules.** Ask why: the fix names by record why the row did not stage (cast pool, the `lived` rule, the spacing window or the result's date). One rule, all 56 places: the proof draws its place and names the seed.

**Done when.** `src/director/school-goodbye-scene.test.ts` (branch `finisher/school-last-day`) passes on two seeds in a buildBenchWorld drawn place, staging the last day from the player's result record id; the diploma scene's test on branch `finisher/diploma-home` passes where the player graduated.

**Time box.** 2 hours.

**You will see.** On the last day of school a classmate says goodbye and asks what you're doing next.

**Screenshot.** None; the tests' logged lines.

**Files.** src/director/circumstance.ts, src/director/school.ts, src/director/data/circumstances.json

**Notes.** The lines are written and wait on the two branches above.
