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
after:
lead: governing
standard: 2
model: opus
effort: high
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A taken bribe can surface only through a falling-out between the two parties, never through the official's unexplained wealth. In four drawn places played two years each (`scripts/research/bribe-chain-years.ts`: Enfield, New Hampshire, seed 894789ccc529a285; Wheatfields, Arizona, 38ded4c5596ad190; Davie, Florida, 694f68f1f5df5250; Wilkeson, Washington, bccec869be3dbd2b), 22 bribes were taken and none surfaced or reached the press. These bribes passed between near strangers (the tie term was at most 0.043), so there was no tie to sour. The Justice Department's charging counts (`data/research/corruption/doj-pin-2023-local-state-prosecutions.json`) are a floor to report beside the result. The owner ruled that officials' finances are public, so unexplained wealth draws investigations (owner-why-money-exists, point 4). Add that route. Seen: a taken bribe reaching the press and the paper, which today almost never happens.

**Cause.** Measured: `scripts/research/bribe-chain-years.ts` (each place's seed is given below) over four places two years (Enfield NH 894789ccc529a285, Wheatfields AZ 38ded4c5596ad190, Davie FL 694f68f1f5df5250, Wilkeson WA bccec869be3dbd2b): 22 bribes taken, none surfaced. Surfacing is only the falling-out telling in `src/core2/modules/corruption.ts` (`corruptionTellWeight`, line 673).

**Fix.** Add a second route: an official's yearly disclosure shows their wealth against their pay, and a reporter, a rival or an auditor who reads it weighs looking into a rise the pay does not explain, by their own reasons, reading on the disclosure date only. A look reaches a reported record the voting engine's scandal term reads.

**Time box.** 8 hours for one opus session.

**Rules.** No dice: whether anyone looks into the wealth follows that person's own reasons and what the disclosure shows, never a chance to catch. Look before you ask: owner-why-money-exists (4) and #5333. Wire to the world: a surfaced bribe reaches the press record the voting engine's scandal term reads. One rule, all 56 places. Speed: read on the disclosure date only. The federal floor is a figure to report, not a target.

**Done when.** A second session runs the bribe-chain script across four drawn places played two years (`buildBenchWorld`, seeds named in the PR) and sees at least one taken bribe surface through the official's disclosed wealth and reach a reported record by id; the surfaced and reported counts per place-year are reported next to the federal floor. `src/core2/corruption.test.ts` passes with a case where a rise the pay explains draws no look and one it does not draws one.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/core2/corruption.test.ts, scripts/research/bribe-chain-years.ts, data/research/corruption/doj-pin-2023-local-state-prosecutions.json

**Notes.** Filed Oct 25 by the effects lead from gov-bribes-in-played-worlds-measured.

Deferred Oct 25: nothing on screen reads it yet.
