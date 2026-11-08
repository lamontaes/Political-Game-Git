---
id: law-levels-snap-cash-assistance-scope
title: "SNAP time limits must not disqualify recipients of unrelated cash assistance"
area: laws
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: astra/snap-cash-scope
pr: #7345
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-08T00:43:17.882Z
---

**What.** The welfare budget handler passes the SNAP assistanceTimeLimit into payBenefits, which can end unrelated cash assistance after the SNAP three-month allowance. The federal rule in 7 USC 2015(o)(2) governs participation in SNAP, not every cash benefit financed by a welfare budget. Keep each requirement attached to the program the statute actually covers, and preserve any separately sourced cash-program requirements.

**Rules.** One engine per mechanic: program scope is data read by the existing benefit and law engines. Federal and state law must be exact; do not remove a real program requirement merely to improve timing.

**Done when.** A test in a buildBenchWorld drawn place prints its replay and named payment obligation ids, demonstrates that federal SNAP enactment and repeal affect SNAP eligibility while unrelated welfare cash obligations remain governed by their own law, and fails with the old cross-program reader.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/federal-snap-cash-scope.test.ts

**Notes.** Astra Nov 8 source inspection: group-b.ts runBudgetLine passes assistanceTimeLimit to payBenefits; group-b-money.ts payBenefits calls timeLimitedNow and recordDraws using that SNAP rule. Primary source https://www.law.cornell.edu/uscode/text/7/2015 subsection (o)(2). Existing SG-GOV-REACH-B-assistance-benefits describes SNAP eligibility approximations but not cross-program cash disqualification. Not established as the cause of the Montpelier memory regression; validation follows below.

Astra implementation note: remove the cash payment reader and recorder of SNAP months, and stop refreshing cash assistance on a SNAP-only law event. The unchanged food-aid engine remains the only caller of timeLimitedNow and recordDraws. Generated-world regression covers both immediate law events and cash-budget review, including restoration of SNAP payment amounts after repeal. Budget amendments and prior benefit months are controlled fixtures; Laplace LA replay 7ada4eb973211f25 preserves all 57 cash obligations while six food-aid obligations stop and return; the old reader leaves only 47 cash obligations. Final test passes ten fresh draws, plus the Hudson Crossroads VA d5e6042308086413 explicit-recipient edge fixture. New-game check passes Woodlawn MD 29cacc5f44725645 for four weeks. Skill checks pass 153/154; the report-style failure is reproduced on clean main cd401b3d15 in three unchanged reports. These fixtures do not certify all SNAP exemptions or state/county authority.
