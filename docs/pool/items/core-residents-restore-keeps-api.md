---
id: core-residents-restore-keeps-api
title: "A restored world that runs into a new month stops in the counted households' monthly step"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: speed
source: S6 (gov-serve-ask-price-said-aloud, #9548), Nov 16 2026
standard: 2
model: sonnet
effort: low
root: none
---

**What.** A world restored from a snapshot (`restoreWorld`) and then run into the first day of a new month throws "Cannot read properties of undefined (reading 'state')" in `savingClaim` (src/core2/counted-money.ts:117). The call comes from renewal's monthly counted step (`countedMonth`, through `applyCountedFlows` and `countedHouseholdCash`). Seen: Santa Rita, Guam, seed 1b2c3d4e5f607182 at 596dfad5, restored on Nov 30, 2025 and run to Dec 1 (the #9548 played-file script, which undoes a talk by restoring the day's snapshot).

**Cause.** Found in code: the residents snapshot part (src/core2/modules/residents.ts, `registerSnapshotPart`) drops `api` when it saves the runtime, and its `restore` builds the new runtime without it. `rt.api` is set again only in `openResidentsDay`, but on the first of a month renewal's `onCalendarWork` reads the counted households before that, through `savingClaim`, which reads `rt.api!.state`.

**Fix.** In the residents part's `restore`, carry the rebuilt runtime's `api` (`api: rebuilt.api`) as it already carries `input`. Prove it with a restore round trip that runs across a month's first day.

**Time box.** 1 hour for one sonnet session.

**Rules.** Wire to the world: a restored world runs on through the same engines as one never restored, across every monthly step.

**Done when.** A second session runs the new test in the running game's world: it restores a played world (a named place and seed) on the last day of a month and runs it two days, and the second session sees no throw and the counted households' cash matches a run of the same world that was never restored.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts
