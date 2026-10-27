---
id: tests-renewal-player-home-counts-earlier-plans
title: "The player-household renewal test counts an unplanned plan made before the player took the household (red on main in Comfrey, Minnesota)"
area: people
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/renewal-player-home
pr: #6270
blocked-on:
source: laws-and-effects lead, Oct 27 (PR #5669's gate, replayed on main)
claimed-at: 2026-10-27T08:58:50.160Z
---

**What.** src/core2/renewal.test.ts 'never puts an unplanned pregnancy in the player's own household' plays a drawn town 30 days, makes a waiting couple's mother the player, plays 100 days more, and expects no unplanned plan in her household. It counts every plan in the household, including ones made before she became the player. On clean main at 5585039e18 with GOLDEN_PATH_SEED=82ed9b488c1275d7 it draws Comfrey, Minnesota (2712772, world seed e7305349fb37d66c9e4276a0fdb39158bfa30a6e70e1e17352be4744c0ce8498) and finds a plan for couple partnership_aa34c2ec9d1cf63a dated January 21, 2025, the opening, and fails. The proposed fix keeps only plans dated on or after the day the player took the household.

**Rules.** Ask why (owner, Oct 14): a failure names the plan, the couple and the day the player took the household, so the record says why. No dice and no skipped checks: the check still holds every plan from the day the player holds the household, and only its filter on earlier plans changes.

**Done when.** On GOLDEN_PATH_SEED=82ed9b488c1275d7 the test passes in Comfrey, Minnesota (a played world built by buildBenchWorld), counting only plans dated from the day the player took the household, it fails on that seed before the change, and it passes on one fresh seed with the place named.

**Time box.** 1 hour, one Sonnet fixer; waits on nothing.

**Files.** src/core2/renewal.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27: found in PR #5669's gate and replayed on clean main with the same base.
