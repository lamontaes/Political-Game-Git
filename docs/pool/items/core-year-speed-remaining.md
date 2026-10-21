---
id: core-year-speed-remaining
title: "A town year is still over 120 seconds after the monthly price fix (about 153 s in Garden City, Idaho and Exeter, New Hampshire on a 4-core cloud container)"
area: core
kind: bug
priority: 1
status: done
claimed-by:
pr: #4586
blocked-on:
milestone:
source: "found by the session that took core-year-over-120s"
claimed-at:
---

**What.** After the monthly price settlement was grouped (one payment per counted group instead of one per counted household), the played-world year in Garden City (key 1629620, seed speed-gc-1) measured 193.6 → 153.3 s and Exeter (key 3325300, seed speed-ex-1) 210.4 → 153.6 s, same cash and gross debit. The rest is spread out: garbage collection about 21% of a month, cash journal posting about 13% (`postCashJournal`, `projectCashJournal`, `copyProjection`), then payroll, campaign statements, press week, housing review, and the heap grows from about 700 MB to 2.6 GB across the year. Profile again, take the next measured hot path, and find what the heap keeps.

**Rules.** Speed: never scan the whole world or a whole history every day; act on the day something changed. Measure before and after on the same base, one process at a time. Bookkeeping is a debug switch: copying and freezing in `postCashJournal` should not run in play.

**Done when.** Both places under 120 s, one process at a time, on the machine the speed guard uses, with identical cash and gross debit to base. Shown in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, with the test named and the record ids that prove it.

**Files.** src/core2/journal-state.ts, src/core2/journal.ts, src/core2/modules/ (campaigns, press, housing), src/core2/counted-money.ts

**Notes.** Method: a scratch script around `buildBenchWorld` (two-level, `placeKey`), `advanceCore` per day, a CPU profile over 30 days in October. The hot path fixed first was `month` in `src/core2/modules/place-prices.ts`.

Session handed off Oct 15, 2026: PR #4447 (cash journal checks only with bookkeeping on) gives Garden City 119.9 s, Exeter 133.2 s; PR #4410 adds a 64 MiB young-generation flag (Exeter 116.5 s) untested in the packaged app; remainder: land both, verify the flag in Electron, confirm both towns under 120 s.

Sent back 2026-10-16 from PR #4447 (branch claude/core-year-speed-remaining): merging main conflicts in docs/pool/items/core-year-speed-remaining.md (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4586 (branch claude/core-year-speed-remaining-finish): Merger: not merged. Merging current main into this branch conflicts in docs/pool/INDEX.md (generated; `npm run pool` rebuilds it) and docs/pool/items/core-year-speed-remaining.md (another change set that item's status on main). Please merge main, keep main's status and your notes in the item file, regenerate the index and push; finish on that branch, merge main into it first.

Ran the 56-place year on main (Oct 16, evening; `scripts/core2-year/all-places.mjs --years 1 --seed s5-oct16 --workers 2` on a 4-core, 15 GB cloud container, two workers at once, so each year ran slower than alone): 56 places, 0 crashed, money, ended-jobs, seats and ballot checks all passed. Seconds a year in this setup: Yauco, Puerto Rico 215.7; Blackfoot, Idaho 189.9; Closter, New Jersey 186.8; Golden, Colorado 185.9; Lafayette, Louisiana 179.5; Woodhaven, Michigan 178.6; Normal, Illinois 176.3; El Sobrante, California 163.8; Waldorf, Maryland 159.4; Washington, D.C. 147.2; West Jefferson, Ohio 145.7; Ardmore, Pennsylvania 144.6; Greenville, Rhode Island 133.2; Altamont, Oregon 121.8; the other 42 places ran between 23 and 115 seconds. Peak heap 0.5 to 2.2 GB. These are the places to measure alone on the Mac first when this item is worked; the full table is in /tmp/claude-0/allplaces.json of the session that ran it and reproduces with the seed above.
