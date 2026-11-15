---
id: core-long-run-heap-past-year-14
title: "An unattended played world runs out of a 6 GB heap before year 30: Bastrop, Louisiana at year 22, Bloomingdale, New Jersey at year 14"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
checked: Account lead T54 2026-11-14
source: Account lead T54, 30-year home-price runs for world-counted-renters-buy (#9117), Nov 14, 2026
---

**What.** The owner's speed rule asks that a save run hundreds of years with memory holding flat (OWNER-DECISIONS.md, Oct 30 01:55). Two unattended played worlds, run with `scripts/research/home-price-paths.ts --years 30` under `node --max-old-space-size=6144`, aborted on the heap limit (exit 134, V8 "Reached heap limit") long before year 30. Seen: no 30-year result exists for any place, so the long view of home prices, population and money stops at year 14 to 22; a player's save over decades would do the same.

**Cause.** Measured: on branch claude/project-thread-w31iec at 769a06dc (Nov 14, 2026), Bastrop, Louisiana (place 2204685, `drawPlace("c3", "home-price-paths")`, world seed 452a3c32cb1dec08db7647f6288fecab595bf56002a3112926e035d4f043a7c0) aborted after year 22 (2047-01); Bloomingdale, New Jersey (place 3406340, `drawPlace("e5", "home-price-paths")`) aborted after year 14 (2039-01). Both processes held about 6 GB resident at year 11 and 17. Seconds per year grew with the save: Bastrop 138 s in year 1, 325 s in year 10, 788 s in year 15, 1,020 to 1,105 s in years 19 to 22; Bloomingdale 386 s in year 3, 781 s in year 11, 1,329 s in year 13. Which tables grow was not measured; the many `core-long-run-*` items each fold one table, and this item is the check that the set of them holds a whole save flat.

**Fix.** Run the same two places with a heap snapshot or a per-table record count at years 1, 5, 10 and 14 (`npm run speed:year` reports records kept), name the tables whose rows grow with the years, and file or claim the `core-long-run-*` item for each (fold old rows into summaries once play no longer reads them, `cadence-and-summaries`). Done when both places reach year 30 under 6 GB.

**Time box.** 3 hours for one Opus session at medium effort to measure and file; each fold is its own item.

**Rules.** Speed: years 97 to 100 at most 1.2 times years 1 to 4, memory and records kept likewise; nothing scans the whole world or history every day. One heavy run at a time (`heavy-runs`).

**Done when.** A second session runs the played world (`buildBenchWorld`) 30 years under a 6 GB heap at Bastrop, Louisiana, at Bloomingdale, New Jersey, and at one more drawn place from all 56 that nobody chose, naming its seed, and the records kept at year 30 are within 1.2 times year 4's, table by table.

**Waits on.** Nothing.

**Files.** scripts/research/home-price-paths.ts (the run), scripts/core2-year (records kept)

**Notes.**
