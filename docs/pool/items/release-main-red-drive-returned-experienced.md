---
id: release-main-red-drive-returned-experienced
title: "A household returned to the counts stops the world when it answers a counted illness or death with a cause"
area: core
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-drive-returned-experienced
pr: 8977
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (Fable A on #8928, comment 6840641000; Account lead T3 in place 1521230)
---

**What.** A played world on the bench stops with "Drive requires a learned source event and a finite strength." when someone in a household returned to the counts falls ill or dies in the counts and a housemate takes up a cause from it. Seen twice on Nov 12: by Account lead T3 playing two years in place 1521230 (world seed 7ac909b527e9b337571785c3c3973c841896d8a40fdd7e917a0d2675c10cc96b, stopped on 2026-08-01 and 2026-03-27), and in CI on #8961's `journal-story.test.ts`. Seen: the year plays on, and the housemate holds the cause.

**Cause.** Found in code: since #8518 (Nov 12), `stillCounted` in src/core2/modules/drives.ts lets a person returned to the counts (`isDemoted`) answer a counted event through their kept full record. `respond` then takes the full-person path, and `writeDrive` writes the drive on that record, but nothing records that they lived through the event: the counted flows emit it with no `personIds` and name them only as `counted-perceivers` (src/core2/births-counted.ts, the onset and death emits). `updateDrive` in src/core2/state.ts, with bookkeeping on (tests and the bench), refuses a drive whose holder did not experience its source event. Measured: `GOLDEN_PATH_SEED=5ab3e1c0d2f49a77 npx vitest run src/core2/drives-counted-returned.test.ts` throws that error on clean main with the same stack (Liyu, Northern Mariana Islands).

**Fix.** In `respond`, a returned person who answers the event records that they lived through it, as a counted actor filled in during the event already does. New test src/core2/drives-counted-returned.test.ts: a drawn place's household is filled in, returned to the counts, and a member dies in the counts as the counted flows emit it, with bookkeeping on; each drive the others take up names the event they lived through.

**Time box.** 1 hour

**Rules.** One model, two tiers: a person back in the counts answers by the same rule as a full person and keeps the same record of what they lived through. Ask why: the drive names its source event by id.

**Done when.** A second session runs drives-counted-returned.test.ts on main at GOLDEN_PATH_SEED=5ab3e1c0d2f49a77 and at a fresh seed, each naming its drawn place, and both pass; and plays place 1521230 at world seed 7ac909b527e9b337571785c3c3973c841896d8a40fdd7e917a0d2675c10cc96b on the bench through 2026-08-01 with no stop.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/core2/drives-counted-returned.test.ts
