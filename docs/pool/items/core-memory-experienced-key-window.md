---
id: core-memory-experienced-key-window
title: "A big town still runs out of memory in year four: the bare lived-through keys are kept 90 days"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After the circle log window (#7198), Arcadia, California (0602462, seed app-heap-1) still runs out of the desktop app's 4,096 MiB heap about 11 minutes into its fourth year. The next largest table is knowledgeByPerson: 722,306 keys after the election year, about 140,000 of them bare event keys for speeches, campaign messages, shared causes and drive changes. Those keys are forgotten only after experiencedKeyRetentionDays, 90 days.

**Rules.** Keep it simple: memory stays flat and keeps only what play reads. An effect is a read: the key's only readers are the same-day appraisal and a drive's update, and a key a held drive cites is kept. Estimate, never UNKNOWN: the window stays a TUNABLE row inside its declared spread.

**Done when.** speed-years/run.ts --years 4 at --max-old-space-size=4096 plays all four years of Arcadia, California (0602462, seed app-heap-1) in the played world without running out of memory, heap per year in the PR body against main, or names the next table by size; the knowledge-retention test passes.

**Files.** src/core2/data/parameters.json,src/core2/knowledge-retention.test.ts

**Notes.** TODO

Nov 4, 08:10 UTC (Lane 5): tried and not shipped. With experiencedKeyRetentionDays at 45 on top of #7198 (branch lane-5/experienced-key-window, b8818c6659), Arcadia at 4,096 MiB: year 2 heap 2,136 MB (2,191 without it), year 3 2,444 MB (2,436 without it), year 4 still out of memory. The bare keys are not where the memory is; the rest of knowledgeByPerson (heard promises 59,157, people met and named about 106,000, event facts) and the growth inside the 2028 election year are. Back to open; the branch stays for the record.
