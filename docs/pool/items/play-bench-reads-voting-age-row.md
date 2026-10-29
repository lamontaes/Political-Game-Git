---
id: play-bench-reads-voting-age-row
title: "The bench's checks and screens read the one voting-age row, not a typed 18"
area: play
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Seven bench sites still type the age of majority as 18 after the core moved to the one votingAge row (src/core2/data/parameters.json): src/bench/m0-check.ts:39, scene-check.ts:19, m1-10-check.ts:131, verify.mjs:125, play.mjs:2355 and :2427 (the household home label for a minor), and whole-figures.ts:236 (the figure's teen band). A view that types its own version of a fact is a duplicate (AGENTS.md first bullet). The play.mjs sites need the card to send whether the person is a minor, read from the row.

**Rules.** One engine per mechanic and the simulation as the one layer: a screen reads the age from the record the core gives it, never its own number. Every number lives in a parameter table.

**Done when.** rg over src/bench for an age compared with 18 returns no site; the card's minor flag is read from votingAge; a buildBenchWorld drawn place shows the household home label for a minor unchanged (test named in the PR).

**Files.** src/bench/play.mjs,src/bench/m0-check.ts,src/bench/scene-check.ts,src/bench/m1-10-check.ts,src/bench/verify.mjs,src/bench/whole-figures.ts

**Notes.** Filed by wire-elections-and-campaigns (law-reach age rows). lead: play-first.
