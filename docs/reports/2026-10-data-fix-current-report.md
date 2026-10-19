# Current office pay replaces dated salary bases

Games now use office pay in force on October 11, 2026, including statutory adjustments. The review covers all 122 salary facts already in this correction. Massachusetts governor pay is $243,493, comprising the $185,000 base and $58,493 adjustment. All 168 office/place pairs across 56 jurisdictions return positive annual pay. The remaining 46 pairs keep their labeled estimates.

## What changed and why

**Measured:** The current-pay review changes 84 of the 122 amounts and retains 38. Every fact records a source, effective year or term, and an independently written locator. [The current-pay receipt](2026-10-data-fix-current-pay.json) lists the changed amounts.

**Measured:** Massachusetts excludes the separate housing allowance. New Jersey governor pay is $210,000, and ordinary legislator pay is $82,000. The current ordinary-office facts exclude future-term increases, expenses and leadership supplements in [the salary journal](../../data/source/official-office-pay/facts.json).

**Measured:** Two current judicial rates were cross-checked against the July 2026 NCSC court-administrator survey. Oregon uses the reported $209,160 annual trial-judge rate after its statutory COLA. Tennessee governor pay derives from the reported $241,104 Supreme Court associate rate plus the statutory $5,000 chief supplement. Both formulas and sources are recorded in [the salary journal](../../data/source/official-office-pay/facts.json).

**Measured:** Payroll calculation and salary estimation logic retain their implementation. The source exporter is [export-office-pay.ts](../../scripts/source/regional-money/export-office-pay.ts).

**Inferred:** Updating salary inputs can change subsequent pay and simulation records.

## Checks and existing defects

**Measured:** The affected salary and shipping tests pass 15 tests across three files. The all-56 check returns 122 sourced salaries and 46 estimates. [The current all-56 receipt](2026-10-data-fix-current-all-56.json) records every office/place pair.

**Measured:** The production build passes, including typecheck. The final bundle scan checks 3,821 files totaling 1,249,313,926 bytes and reports zero violations. [The scan receipt](2026-10-data-fix-current-bundle-scan.json) records the checked files.

**Measured:** Salary regeneration, changed-file ESLint and Prettier, the PR release check and zero-dice pass. All 62 preserved research files match their recorded hashes. [The current validation receipt](2026-10-data-fix-current-checks.json) records commands and results.

**Measured:** The finisher reproduced five older failing tests on clean main at its baseline. The four ordinary-life failures concern a missing monthly cost flow, a missing first-month moment, and missing jurisdictions on two governor payroll routes. This session reproduced those four before refreshing the final salary inputs. The observer test is recorded from the finisher's clean-main reproduction in [its review](https://github.com/lamontaes/Political-Game-Git/pull/3954#issuecomment-6105395225).

| Existing failing test                                                                                                                                                                  | Observation                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/presentation/ordinary-adult-life.test.ts`: "charges a tracked person on each first of the month, and only once"                                                                   | Monthly flow is null.                                                |
| `src/presentation/ordinary-adult-life.test.ts`: "offers the first short month as a moment, with its amounts, once"                                                                     | Expected moment prose is undefined.                                  |
| `src/presentation/ordinary-adult-life.test.ts`: "pays a governor weekly, once per week"                                                                                                | The payroll route reports a missing jurisdiction.                    |
| `src/presentation/ordinary-adult-life.test.ts`: "pays a New York governor the state's published salary, weekly"                                                                        | The payroll route reports a missing jurisdiction.                    |
| `tests/nationwide/office-salary-initialization.test.ts`: "matches the old first-call flow at the actual current date without paying, survives reopening, and preserves existing terms" | History length changes; Arkansas expects 86,385 and receives 86,387. |

## What happens next

The CTO decides the final PR merge. The five existing defects remain separate work. This correction claims no completed multiweek payroll-law playthrough and no new golden-path progress. Book of the States seat counts, veto windows, executive-order rules and party balance remain outside this PR. Their official-source replacement follows roadmap research topics R7 and R21, as directed in [the owner ruling](https://github.com/lamontaes/Political-Game-Git/pull/3954#issuecomment-6105441258).

## Method and handoff

Branch: `pool/data-fix`. Main was merged with two-parent merge commits; no rebase or force-push. The final incorporated main revision is `8df9cb2f87bf099d921b1aaf62613e69506a7bc2`. This report supersedes the original handoff's historical-salary scope; its earlier receipts remain preserved.

Official records were read through the connected web tool and public publisher downloads. Missing direct responses were resolved with official alternate publications or the publisher's indexed record. Whole annual dollars follow the recorded published rate or formula. Heavy validation used the workspace storage guard.

Model: Codex, GPT-6 family. Requested repository effort: medium for data and packaging work. Actual provider effort, exact deployment ID and token usage are not exposed. No escalation and no implementation helpers. A read-only civic-report reviewer checks this handoff. This is one salary-policy send-back following the finisher's review and the owner's ruling.

Session time: approximately 04:31–05:40 UTC on October 11, 2026, or 69 minutes through validation and handoff drafting. Final review and publication time will be recorded in the posted result.
