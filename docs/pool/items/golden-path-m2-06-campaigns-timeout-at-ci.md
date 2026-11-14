---
id: golden-path-m2-06-campaigns-timeout-at-ci
title: "Golden path M2-06 (polls) timed out in CI at Palma Sola, Puerto Rico"
area: gov
lead: governing
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, CI of #9252 (not from #9252)
claimed-at:
standard: 2
model: opus
effort: medium
root: none
---

**What.** In CI on #9252 at 32df871d, golden-path M2-06 ("Polls", `npx vitest run src/core2/campaigns.test.ts --testTimeout=300000`) at Palma Sola, Puerto Rico (seed 2a3f5af22f413d71fc5d1001479d560addb34cd50eceba480d986f66b175b2c6) ended as `timeout` after 143,910 ms, and the five accepted specs after it (M2-07, M2-08, M2-04, M2-09, M3-09) were `not-reached`, so the run stood red on a spec the change does not touch. The spec reads the polls a player sees. Seen: the golden-path table in CI and the polls a player reads.

**Cause.** Needs cause. Measured: the CI run above spent 143,910 ms on the spec at that place and seed before it was cut off; the same spec has not been timed on its own at this place.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one opus session.

**Rules.** Speed: a spec's own limit is not loosened to get green; no test is skipped.

**Done when.** In the played world (buildBenchWorld) at Palma Sola with the seed above, a drawn place run of `src/core2/campaigns.test.ts` is timed on the train head and the step that took the time is named by profile; the fix brings the spec under its limit in CI, and a second session sees M2-06 pass with the five specs after it reached.

**Waits on.** Nothing.

**Files.** src/core2/campaigns.test.ts

**Notes.** CI run https://github.com/lamontaes/Political-Game-Git/actions/runs/43618870786. Earlier validate runs on the train were canceled by newer pushes, so no clean baseline exists yet. Filed by hand.
