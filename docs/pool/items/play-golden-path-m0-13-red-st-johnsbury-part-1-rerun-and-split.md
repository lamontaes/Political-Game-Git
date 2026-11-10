---
id: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split
title: "Re-run M0-13 on current main in St. Johnsbury and split what still fails"
area: core
kind: bug
priority: 1
size: S
status: done
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: high
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The M0-13 draw in St. Johnsbury, Vermont is more than a month old, and many fixes have merged since. Before anyone fixes a symptom, re-run the check on current main in that place and seed and write down what still fails, then file each still-failing symptom as its own item with a cause, or mark the part for it dropped when the symptom is gone. The six symptoms of the old run were heap growth of 110.5 MiB a month, modules that never ran (public projects, succession, world races, ballot measures, past), 2 of 15 races with no one on the ballot, 9 of 2,830 homes with no value or rent, 7 of 42 people paid with no cash at the end, and new businesses borrowing more than 9 times the founder's cash.

**Cause.** Measured: GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 node --max-old-space-size=8192 --expose-gc --import tsx tests/golden-path/played-world.node-test.ts in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) failed on main 663a38fedf (Oct 28); none of the six symptoms was traced to a file, and the draw predates much that has merged since.

**Fix.** Run the command on current main in that place and seed (heavy run: follow the heavy-runs skill, one at a time), record which symptoms remain with their numbers, and for each remaining symptom find its engine and update the matching part item (parts 2 to 5) with the file and line that writes the number, or, if the symptom is gone, note that in that part's Notes and propose it for dropping. Add a new part item for any symptom the old run did not list, including each module that still never ran.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session reads the result of the re-run of the golden-path test on current main in the drawn place St. Johnsbury, Vermont with the seed above (the output pasted in the pool item's Notes, naming the commit), and finds every still-failing symptom either named in one of parts 2 to 5 with a file and line or filed as a new item at the standard, and every gone symptom noted as gone.

**Waits on.** Nothing.

**Files.** tests/golden-path/played-world.node-test.ts, docs/pool/items/play-golden-path-m0-13-red-st-johnsbury.md

**Notes (Fable, Nov 10, proposed for the CTO).** Proposed: close, the re-run is done. On main cb25bfa5c8 the item's command (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4; the year ran in 105 seconds) passes 21 checks and fails 1. What still fails, by part: part 2, heap growth of 16.7 MiB a month against a 5 MiB ceiling; part 3, one of three races with no one on the ballot and a challenger off it (cause found and written in that item); part 5, 10 of 11 new businesses borrowing more than 9 times the founder's cash. What no longer fails: part 4, homes and pay. The opening's two memory ceilings also read broken (398.7 MiB after import against 150, and 632.4 MiB after the opening against 250); those are the check's known-failing lines and belong to the memory items.

**Notes (CTO, Nov 10).** Closed on Fable's proposal: the re-run it asks for is done and recorded in #8209 (St. Johnsbury, Vermont on main at cb25bfa5c8).
