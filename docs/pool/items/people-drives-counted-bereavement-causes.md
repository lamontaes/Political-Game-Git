---
id: people-drives-counted-bereavement-causes
title: "A counted household that outlives a member takes up a cause by the same bereavement rule as a named household"
area: people
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #5821
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** When someone in the wider population dies (births-counted.ts), no event is recorded, so the household that outlives them never perceives the loss. A named household perceives a death through the bereavement rule in drives.ts and may take up a cause. Record a counted death as a private event of its own kind that names the dead as its counted subject and the household it left, and have each survivor respond by the same bereavement rule, read from their counted record. A cause they take up is kept until they are filled in.

**Rules.** One model, two tiers: a counted survivor perceives a death by the same roles, channels and responses as a named one, read from their own record. No dice: whether they take up a cause comes from their traits and the event, never a roll.

**Done when.** In a one-year buildBenchWorld played world in a place drawn from all 56 (seed named), a counted survivor holds a cause formed from a counted death event by record id, every counted perception of it is scored by the shared rule as family or household, and the survivor filled in holds the same drive and goal, shown by a test in src/core2.

**Files.** src/core2/births-counted.ts, src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/data/health.json

**Notes.** Split from people-drives-counted-tier-causes. Built stacked on the job-loss wiring (#5816), whose counted-actor path it reuses.

Sent back 2026-10-21 from PR #5821 (branch claude/counted-bereavement): The bereavement test hits its final no-witness failure on seed d292a20af22f10b93be7f32e029ef070: four drawn worlds end with zero held bereavement causes, so no survivor-to-fill-in goal chain is tested. Diagnose formation versus fading and provide a reliable positive generated-death witness during the played year.; finish on that branch, merge main into it first.
