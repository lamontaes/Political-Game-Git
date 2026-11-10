---
id: people-bereaved-counted-affect
title: "A death reaches the dead's counted kin as it reaches a full person: counted people carry no mood, so most bereaved feel nothing"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr: #5432
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
standard: 2
model: opus
effort: high
root: design-one-model-two-tiers
lead: lives
---

**What.** The health module's death event moves the mood and stress of the dead person's witnesses, but witnesses are only people in the full-person table, and in the two-level world most of a person's kin are counted people or husks that carry no mood. A run of Biggersville, Mississippi (seed hb1) for 700 days had 13 deaths and not one bereaved full person, so the effect of a death is nearly absent in play. A counted group should be moved by a death the way a full person is, times its count.

**Cause.** Measured: Biggersville, Mississippi, seed hb1, 700 days: 13 deaths and no bereaved full person (the item). Code: src/core2/modules/health.ts line 1038 applies moodImpulse only to the dead person's witnesses in the full-person table.

**Fix.** Move a counted household's members by the same bereavement rule as a full witness, times the count, and keep the reasons only for filled-in people. Report the share back at baseline 18 months on with scripts/health/bereavement-band.ts.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count. An effect is a read, not a record: another engine must read the mood a death writes. No dice: who is moved comes from the tie and the person's traits. The chain is the acceptance.

**Done when.** A second session runs a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) and sees, for a named death, the dead's household and kin including counted people moved in mood, with one chain by record id from the death to a named bereaved person's mood and the director's line. scripts/health/bereavement-band.ts reports the share back near baseline at 18 months beside the sourced 66.8 percent (Bonanno 2002); the figure is reported, not a pass mark.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, scripts/health/bereavement-band.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5432 (branch claude/bereaved-counted): merge conflict with main in src/core2/modules/health.ts (code) after #5596; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5432 (branch claude/bereaved-counted): Merging current origin/main conflicts again in src/core2/modules/health.ts. Resolve that code conflict on this branch, retaining both current health/trait behavior and the full/count death impulse paths, then rerun the changed-file gate and the ordinary counted-death proof. The earlier resolution is present, but the current merged result cannot be tested until this new conflict is resolved.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5432 (branch claude/bereaved-counted): The health conflict repair is present, but the item acceptance requires a named record chain from death to a bereaved persons mood and the directors line, and coverage of household and kin including counted people. The body gives aggregate band counts and says counted deaths still find kin only by familyIds; it supplies no named death/mood/director chain. Add the required Done when evidence table and that actual chain, or track the demonstrated bounded mechanism separately while keeping the remaining acceptance open. Keep both full and counted death paths and the ordinary drawn-world test. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5432 (branch claude/bereaved-counted): the Done-when table explicitly marks the director line Not shown and counted household coverage Partly; complete those record-chain proofs or assign the completed mechanism to its own bounded valid item; finish on that branch, merge main into it first.

Deferred Oct 25: nothing on screen reads it yet.
