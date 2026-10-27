---
id: core-speed-cause-group-offers-per-topic
title: "A cause holder's group offers check every group on a topic once per drive, every day"
area: core
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In Opelika, Alabama (key 0157048, seed op1) on main 01f5cd4715, the ninth played month takes 57.8 s, and the drives engine's offer of known cause groups (the known-cause-group provider in src/core2/modules/drives.ts) takes 6.03 s of it, 4.63 s in groupKnown. For each drive a person holds it copies and sorts the topic's group set and checks every group's knowledge fact and membership again, so a person holding several drives on one topic checks the same groups several times a day. Work each topic's reachable groups out once per call, in the same order, and give each drive the same offers.

**Rules.** No dice: the offers, their order and every choice made from them stay exactly the same, by record id. Speed: never scan more than a call needs; measured before and after on the same base and machine, both checkouts in one process.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, drawn from all 56, three years) the deep fingerprint is identical before and after; a CPU profile of Opelika, Alabama's ninth month (seed op1) and a paired Long Hill year show the provider's inclusive time lower and the year no slower; the drives tests pass.

**Files.** src/core2/modules/drives.ts

**Notes.** Filed Oct 25 by the speed lead investigating core-speed-opelika-year-memory-growth. #5994 also changes drives.ts; its nearest hunk is 40 lines from this provider.

Oct 25, 13:30 UTC (speed lead): built on `claude/speed-cause-group-offers` (8efde991e8, on main 71499f28b8) and measured; not shipped, claim released, recommend drop. It is exact: Long Hill, Connecticut (seed m7b, one year) gives deep fingerprint `040f1fbd608e813b` on the base and on the branch, and Stanardsville, Virginia (seed cc91f5444b53bd47, three years) gives `1711a7afb2fab95e` on both. It saves almost nothing: the paired Long Hill year ran 138.7 s on the base and 138.1 s on the branch (ratio 0.996, fingerprints `b26a8d3e70ecce6f` both), and in that pair `groupKnown` takes 0.1 s on each side. Only in a town with runaway cause activity does the provider cost time (Opelika, Alabama, seed op1, ninth month: `groupKnown` 6.15 s inclusive on main, 5.86 s on the branch), and there the cure is people-drives-cause-acts-pull-less. The drives tests on the branch were not needed for a decision and are not quoted.

Oct 25 (CTO ruling): dropped at the speed lead's recommendation; the per-kind score cut and core-speed-contact-offers-grow-with-ties carry what was left.
