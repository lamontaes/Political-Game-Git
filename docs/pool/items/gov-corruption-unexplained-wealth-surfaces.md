---
id: gov-corruption-unexplained-wealth-surfaces
title: "A taken bribe can surface through the official's unexplained wealth, not only through a falling-out between the two parties"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In four drawn places played two years each (scripts/research/bribe-chain-years.ts: Enfield, New Hampshire, seed 894789ccc529a285; Wheatfields, Arizona, 38ded4c5596ad190; Davie, Florida, 694f68f1f5df5250; Wilkeson, Washington, bccec869be3dbd2b), 22 bribes were taken and none surfaced or reached the press. The corruption engine surfaces a bribe only when one party falls out with the other and decides to tell (corruptionTellWeight times how far their tie soured, in src/core2/modules/corruption.ts), and these bribes passed between near strangers (the tie term was at most 0.043), so there was no tie to sour. The Justice Department charges 0.9 to 2.5 state officials a year per state-level place and 0.003 to 0.007 local officials per city, county or township (data/research/corruption/doj-pin-2023-local-state-prosecutions.json), a floor on what surfaces: the four worlds' state legislatures saw none in eight state-years where the floor is about seven. The owner ruled that officials' finances are public, so unexplained wealth draws investigations (owner-why-money-exists, point 4). Add that route: an official's yearly disclosure shows their wealth against their pay, and a reporter, a rival or an auditor who reads it weighs looking into a rise the pay does not explain, by their own reasons.

**Rules.** No dice: whether anyone looks into the wealth follows that person's own reasons and what the disclosure shows, never a chance to catch. Look before you ask: owner-why-money-exists (4) and #5333. Wire to the world: a surfaced bribe reaches the press record the voting engine's scandal term reads. One rule, all 56 places. Speed: read on the disclosure date only.

**Done when.** In the bribe-chain script across four drawn places played two years (buildBenchWorld, seeds named in the PR), at least one taken bribe surfaces through the official's disclosed wealth and reaches a reported record by id, the surfaced and reported counts per place-year are set against the federal floor in the PR body, and src/core2/corruption.test.ts passes with a case where a rise the pay explains draws no look and one it does not draws one.

**Files.** src/core2/modules/corruption.ts, scripts/research/bribe-chain-years.ts, data/research/corruption/doj-pin-2023-local-state-prosecutions.json

**Notes.** Filed Oct 25 by the effects lead from gov-bribes-in-played-worlds-measured.

Deferred Oct 25: nothing on screen reads it yet.
