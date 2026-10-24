---
id: laws-checker-first-asker-cache
title: "The law-wiring checker credits whichever engine first fills a per-day law cache as the law's reader"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The justice helper found on Oct 24 that restore-voting-after-sentence grades its systems link wired only in a third drawn place (Reddington, Indiana, seed 7c6e6a3aa5e6453d), because elections.ts:693 happened to fill the shared per-day election-law cache in src/core2/law-reach/group-a-voting.ts first. In Prescott, Michigan and Uehling, Nebraska the trace names only the interest-groups engine. The checker in scripts/law-wiring/check.ts records the stack of whichever call reads the laws table, so a cached read hides every later engine that reads the same law the same day.

**Rules.** An effect is a read: the checker must credit each engine that reads the law at the moment it decides or pays, not the first caller of a cache. One rule, all 56 places.

**Done when.** scripts/law-wiring/check.ts credits every engine that reads a law through a per-day cache, shown in a played world (buildBenchWorld, seeds a91c03e7d2b84f10 and 5e27b0c4196fd3a8) where restore-voting-after-sentence names the voting or elections engine by file and line as a reader.

**Files.** scripts/law-wiring/check.ts, src/core2/law-reach/group-a-voting.ts

**Notes.** From the laws lead's justice helper, Oct 24 (branch claude/laws-nine-links-justice).
