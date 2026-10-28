---
id: people-in-state-moves-name-no-cause
title: "Counted households that move within the town's state record no reasons"
area: people
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #6139
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In a played year of Dewey Beach, Delaware (seed 8dc5ab39afc8614e5bd07ce55e2928c003d310c3b9981c71b90843bc8e7c60e8), 79 of 89 counted moves had empty reasons: every move between the town and the rest of its state. src/core2/modules/counted-moves.ts records reasons: {} when the destination or origin is the town's own state (lines 659 and 873), because it weighs no pull between the town and the rest of its state.

**Rules.** Ask why: every move names the causes that weighed toward it, for counted households as for full people.

**Done when.** In a played year of a place drawn from all 56, every counted move, within the state or across states, records its causes, by record id in the PR body.

**Files.** src/core2/modules/counted-moves.ts

**Notes.** Found by the M0-M2 lead writing M1-13's command, Oct 24.

Sent back 2026-10-26 from PR #6139 (branch claude/in-state-move-causes): Minor-only fallback rate at counted-moves.ts477-482 is never read by monthly weighting, which skips these households at529, but departure recording calls leavingOf696 and records that rate as a cause. Connect recorded causes to actual weighting or the actual group contribution and prove the read; a positive field alone is insufficient. Main integrated02d995da9d; partial checks stopped, no complete year pass claimed.; finish on that branch, merge main into it first.
