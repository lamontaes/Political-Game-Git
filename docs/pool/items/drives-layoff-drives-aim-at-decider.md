---
id: drives-layoff-drives-aim-at-decider
title: "Drives formed from a layoff aim at the person who decided it, and the M1-11 check reads that as a drive aimed at the wrong party"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6212
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On Steamboat Springs, Colorado (0873825, seed 2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7) the unchanged src/bench/m1-11-check.ts fails clause 4 on main and on PR 6044: 13 drives on main (10 with PR 6044) aim at someone other than the party the event names, grudges as well as status-ambition drives, for example grudge:grudge:person_ed141dc62f09520a of person_f5f3892a1a703bb2 aims at person_ed141dc62f09520a while the event names organization_c25c714a667ae3df. Franklin, North Carolina (3724640, seed 23f248b6a1147437ca65cc858b239aeff4ef96fd723ef91676708a7ecf41e085) fails the same clause with 4 drives on main. The drives engine now names the person who decided a layoff as the target (commit ce2ac9a535), and the check wants the party the event names as responsible. Decide which is right and make the engine and the check agree.

**Rules.** No dice: the target follows from the event's records. One rule, all 56 places. The check's assertions are not loosened unless the owner's decision register says a person who decided a layoff is the responsible party.

**Done when.** In the played world (buildBenchWorld, every module) for Steamboat Springs, Colorado seed 2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7 and Franklin, North Carolina seed 23f248b6a1147437ca65cc858b239aeff4ef96fd723ef91676708a7ecf41e085, m1-11-check.ts clause 4 reports no drive aimed at a party other than the one its event names, by record id, and src/core2/drives-economy.test.ts passes unchanged.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/modules/drives.ts, src/bench/m1-11-check.ts

**Notes.** Found Oct 26 by the fixer on PR 6044 (m0-m2 lead helper); counts measured with the unchanged check on clean main and on the PR.
Sent back 2026-10-27 from PR #6212 (branch claude/m1-11-layoff-decider): typecheck error TS2345 at src/bench/m1-11-check.ts:155; finish on that branch, merge main into it first.
