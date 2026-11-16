---
id: drives-status-ambition-aims-at-decider-event-names-employer
title: "M1-11 red at Chalan Pago-Ordot, Guam: a status-ambition drive aims at the layoff's decider while the check reads the employer"
area: people
lead: m0-m2
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Promises thread, Nov 16 02:00Z, from the golden-path-year red on PR 9598 (the same on the clean Train ef708196)"
checked:
---

**What.** The golden path's M1-11 check fails on the Train at one drawn Guam place. It finds one drive aimed at a person while the check reads the event as naming an organization. This is the reverse of drives-status-ambition-aims-at-organization, which is done. On the Train (ef708196) and on PR 9598 (e4e0fc7f) it fails with the same drive, so neither PR caused it.
Seen: `status-ambition:status-ambition:person_138be7a5ef05b270 of person_c5077cdf0b8a0559 aims at person_138be7a5ef05b270, the event names organization_0d5df5f067a4441e`.

**Cause.** Measured: at Chalan Pago-Ordot, Guam (territory:GU:chalan-pago-ordot), seed 8d4cc4f4580c1287b442452f67a86f0431667f49c6548f4442578d26a37089b3, by `GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=territory:GU:chalan-pago-ordot GOLDEN_PATH_SPEC_ID=M1-11 node --import tsx src/bench/m1-11-check.ts`. It fails the same way on both heads. Not yet read: whether `responsibleId` in src/core2/modules/drives.ts named the decider at formation, when the decider was alive or still counted. The check in src/bench/m1-11-check.ts calls the same function at the end of the run, with `core.people` and no counted reader. So a decider who died, or one who is still counted, falls through to the employer.

**Fix.** Read the drive's source event at the pinned place first. If the decider died or is still counted at the end of the run, the check in src/bench/m1-11-check.ts reads the decider as they were when the drive formed: pass the same counted reader the engine passes, and judge aliveness on the formation date. If the decider was never alive or counted at formation, fix `driveIdentity` in src/core2/modules/drives.ts instead. The player sees this when the person laid off holds a grudge in talk against the right person.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Ask why: name by record whether the drive's target or the check's reading is wrong before changing either one. Never weaken the check to get green.

**Done when.** A second session runs M1-11 at Chalan Pago-Ordot, Guam with the seed above, and it passes. That session also passes it at one more drawn place, named with its seed. The PR body names, by drive id and event id, which reading was wrong.

**Waits on.** Nothing.

**Files.** src/bench/m1-11-check.ts, src/core2/modules/drives.ts
