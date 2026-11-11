---
id: play-golden-path-m0-13-red-st-johnsbury
title: "M0-13 is red on main in St. Johnsbury, Vermont on six played-year checks"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split, play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth, play-golden-path-m0-13-red-st-johnsbury-part-3-races-and-ballots, play-golden-path-m0-13-red-st-johnsbury-part-4-homes-and-pay, play-golden-path-m0-13-red-st-johnsbury-part-5-business-borrowing
source: added with npm run pool -- add
claimed-at:
after:
lead: play-first
model: sonnet
effort: medium
root: rc2-done-from-records
checked: fable 2026-11-10
branch: claude/pool-play-golden-path-m0-13-red-st-johnsbury
---

**What.** The accepted spec M0-13 (tests/golden-path/played-world.node-test.ts) failed on main 663a38fedf in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) on six played-year checks: heap growth of 110.5 MiB a month against the test's 5 MiB ceiling; modules that never ran (public projects, succession, world races, ballot measures, past); 2 of 15 races with no one on the ballot (Commissioner and County treasurer, 2025-11-04); 9 of 2,830 homes with no value or rent; 7 of 42 people paid in the last month with no cash at the end; and both new businesses borrowing more than 9 times the founder's cash (largest $215,153). The golden-path-year check turned red on a pull request by this draw. The draw is more than a month old and no cause was traced for any symptom, so the work is split: re-run and split first, then one part per symptom.

**Cause.** Measured: GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 node --max-old-space-size=8192 --expose-gc --import tsx tests/golden-path/played-world.node-test.ts in St. Johnsbury, Vermont failed on main 663a38fedf (Oct 28) with the six symptoms above; none was traced to a file, and the draw predates much that has merged since.

**Fix.** Done through the parts: re-run M0-13 on current main in that place and seed and split what still fails into one item per symptom (part 1), then fix each at its engine, never by loosening the check (parts 2 to 5). Branch claude/quirky-ride-vrwwz4-m0-13-stj is kept; claiming part 1 takes it over.

**Time box.** 2 hours for one Sonnet session, only to confirm once the five parts are done. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so each failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule. Red main comes first (owner, Oct 15).

**Done when.** A second session runs the M0-13 command above in St. Johnsbury, Vermont with the seed above and in two more drawn places (names and seeds recorded) and sees it pass, with each former failure's cause named by file and line in the part that fixed it, and the five parts merged.

**Waits on.** The five parts: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split first, then parts 2 to 5 (heap growth, races and ballots, homes and pay, business borrowing), each of which part 1 may narrow or drop.

**Files.** tests/golden-path/played-world.node-test.ts

**Notes.** TODO

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/quirky-ride-vrwwz4-m0-13-stj` is kept; claiming this item takes it over.

Released (2026-11-11): umbrella that waits on its five parts; part 1 is the work. Continue on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury.
