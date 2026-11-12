---
id: finance-close-employer-no-current-receipt
title: "A played world dies in Superior, Colorado: closeEmployer finds no current unfunded obligation receipt"
area: core
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-finance-close-employer-no-current-receipt
pr: #8661
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:29:40.941Z
---

**What.** A played world dies in Superior, Colorado: `closeEmployer` finds no current unfunded obligation receipt. In Superior, Colorado (GEOID 0875640, place seed a352f38e75486e3885a7fdd8f2dc6c1112a2e6da7628ff7c20dc4aca4c849a54, drawn by salt incumb-B:2, purpose incumbency-totals) a played world with every module installed (`buildBenchWorld`, bookkeeping off) threw "Closure requires an actual current unfunded obligation receipt." at `closeEmployer` within three years. Found by the governing lead's Runner B, Nov 1 16:18 UTC. A PR merged on Nov 1 (#7044, per the draft sorting) may have fixed it, but the thrown message is still in the code, so the fix has not been confirmed by a replay.

**Cause.** Measured: Superior, Colorado (0875640, place seed a352f38e75486e3885a7fdd8f2dc6c1112a2e6da7628ff7c20dc4aca4c849a54) over three years of `buildBenchWorld` with bookkeeping off; the throw is at `src/core2/finance-state.ts` `closeEmployer` (line 1561, thrown at line 1674) when neither an arrears receipt nor `residentWageShortfall` supplies the closing cause. `scripts/core2-year/incumbency-totals.ts`, which the item named, is not on main.

**Fix.** Replay the Superior world for three years on main. If it still throws, make the finance day find the receipt of the firm's actual unfunded obligation (the arrears receipt or the wage shortfall) before it calls `closeEmployer`, so a firm closes only from a recorded obligation. If it no longer throws, add a test that runs the Superior world three years and record it with `npm run pool -- seen`.

**Time box.** 4 hours for one sonnet session.

**Rules.** No dice. One rule, all 56 places. A firm closes only from a recorded unfunded obligation, never by a thrown error. Replace, never layer. Wire to the world: the proof is the played world, not a unit fixture.

**Done when.** A second session runs the Superior, Colorado world (place seed above) for three years with every module installed and sees no throw; each closure in those years either has its receipt, named by record id, or does not happen. The cause is named in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/finance-state.ts, src/core2/modules/finance.ts

**Notes.** Filed by red main from the governing lead's report. Reproduce on main first with the seed above.

**Notes (pool redo, Nov 10).** Kept: the draft sorting proposed a drop because PR #7044 (merge edacbfc31f, Nov 1) was said to fix this, but the evidence does not hold on main: the thrown message is still in `src/core2/finance-state.ts` (line 1674) and no test replays the Superior world. The item is now a replay-and-confirm item.
