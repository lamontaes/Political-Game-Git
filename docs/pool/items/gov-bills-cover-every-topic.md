---
id: gov-bills-cover-every-topic
title: "Bills come from a place's conditions across every topic (transit, health, schools, crime), not only odd ones"
area: gov
kind: feature
priority: 3
size: M
status: done
claimed-by: claude/fs11vb-bills-every-topic
pr: #5444
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:42:47.485Z
---

**What.** The item asked that bills come from a place's conditions across every topic (transit, health, schools, crime) and not only a few. Measured in a played year, they already do: in two drawn places the bills touched all 13 topic families of the policy-question catalog and the budget lines for schools, health and hospitals, highways, police and corrections. What was missing is a guard that fails if a topic family or a main service drops out of what members file. This pass adds that guard as a test; it changes no engine.

**Rules.** No dice: members file the changes their own reasons favor against the law in force, and the test reads that, not a roll. One rule, all 56 places: the place and seed are drawn and named in every failure.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, src/core2/bills-every-topic.test.ts finds a bill for every topic family of the question catalog and for the schools, health, highways and police budget lines, and names the place, key and seed when one is missing.

**Files.** src/core2/bills-every-topic.test.ts

**Notes.** Passed on seeds bt-1 (Lake View, South Carolina, place 4539715), bt-2 (Frazee, Minnesota, 2722472) and bt-3 (Evans, Georgia, 1328044). The original stub had no body; I read "not only odd ones" as the topic spread, and if the owner meant something else (for example the order or volume of bills), this item should be reopened with that spelled out.
