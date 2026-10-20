---
id: people-bereaved-counted-affect
title: "A death reaches the dead's counted kin as it reaches a full person: counted people carry no mood, so most bereaved feel nothing"
area: people
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/bereaved-counted
pr: #5432
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T13:23:21.866Z
---

**What.** The health module's death event moves the mood and stress of the dead person's witnesses, but witnesses are only people in the full-person table, and in the two-level world most of a person's kin are counted people or husks that carry no mood. A run of Biggersville, Mississippi (seed hb1) for 700 days had 13 deaths and not one bereaved full person, so the effect of a death is nearly absent in play. A counted group should be moved by a death the way a full person is, times its count, so the town's bereaved show the sourced trajectories (about two thirds show no lasting rise, Bonanno 2002).

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count. An effect is a read, not a record: another engine must read the mood a death writes. No dice: who is moved comes from the tie and the person's traits. The chain is the acceptance.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) scripts/health/bereavement-band.ts watches bereaved people in the dead's household and kin, counted ones included, and reports the share back within one mood spread of baseline at 18 months against the sourced 66.8 percent, with one chain by record id from a death to a named bereaved person's mood and the director's line.

**Files.** src/core2/modules/health.ts,scripts/health/bereavement-band.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5432 (branch claude/bereaved-counted): merge conflict with main in src/core2/modules/health.ts (code) after #5596; finish on that branch, merge main into it first.
