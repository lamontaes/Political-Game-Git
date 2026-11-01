---
id: tests-campaigns-traits-endorsements-heard-by-draw
title: "The traits test's endorsement case finds no endorsement heard in some drawn towns"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: governing/traits-endorsements-heard
pr: #7072
blocked-on:
source: governing lead, Oct 30 (money fixer's draws)
lead: governing
claimed-at: 2026-10-30T09:43:31.789Z
---

**What.** src/core2/modules/campaigns.traits.test.ts, the case where candidates ask for volunteers and endorsements, fails in Whitinsville, Massachusetts with seed a4eca5af1791dc3df7527d94791fb774b3fcdd52 at its line 483: endorsements heard: expected 0 to be greater than 0. It fails the same way on main's own code, so it is red by draw on main, not a branch's fault. Either the drawn town holds no one whose reasons say yes to an endorsement ask, which the test should redraw past, or the ask reaches nobody because of a real defect in who hears an endorsement, which the fix must name by record.

**Rules.** Never skip or weaken a test: find why by record (ask why), then either redraw from all 56 places with the place and seed named, as seat-leavings.test.ts does, or fix the engine at its root. No dice: whether anyone endorses stays their own reasons.

**Done when.** With GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 the traits test's endorsement case (candidates ask for volunteers and endorsements, and the answers are on the campaign's record) passes, with its strict per-row checks (the named endorser said yes for that candidate; the voter is in that endorser's circle) run on snapshots of the endorsement causes taken before a race's count (the eve of the first count, and the window's last day for races still to be counted), and the same case passes on five fresh draws in a row, each naming its place and seed and its per-row check count (above zero). The PR body names by record why Whitinsville heard no endorsement. The rest of the traits file on that seed is not this item: see Notes.

**Files.** src/core2/modules/campaigns.traits.test.ts, src/core2/modules/campaigns.ts

**Notes.** Nov 1 (governing lead, review of ed93f41c81 on governing/traits-endorsements-heard): this item is the endorsement case only. The traits file as a whole still fails by draw on the named seed and on main, in two other cases that are now their own items: the running-for-office odds ratio in Cruz Bay, U.S. Virgin Islands (draw :0, 3.26 against a ceiling of 2.67), item tests-campaigns-traits-run-ratio-cruz-bay (new); and the giving odds ratio in Lyndon Center, Vermont (GOLDEN_PATH_SEED=chk2-c, draw :0, 4.39 against a ceiling of 4.01), item traits-donate-reasons-too-flat-in-some-towns (open, evidence added). The root cause of the red is that #6917 changed foldCauses so a closed race's causes fold into causeSummaries at the count, without updating this test, which read the causes after it. OWNER-DECISIONS Oct 30 08:41 moved this reader to before the race closes.
Nov 1 (governing lead's helper, branch governing/traits-endorsements-heard, head 70af1021b9): the redraw judges the whole window, so a draw is passed over only when people were asked and either none said yes or the yes answers reached listeners none of whom had a kept why on the day asked. Lyndon Center, Vermont (chk2-c:0) is not passed over: its first race had no kept why, but the later race's asks did (263 endorsement cause rows on the last day). Runs on that head: the named seed passes this case in Cruz Bay (86 strict checks) and fails only the running-for-office case; chk2-a passes (Tiki Gardens, Hawaii, 53 checks); chk2-c passes this case (263 checks) and fails only the giving case; three fresh seeds pass (Fennville, Michigan 323; Gainesboro, Tennessee 104; Soldier Creek, South Dakota 8,796; Natural Steps, Arkansas 37,865).
