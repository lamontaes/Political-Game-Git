# Money sources are arriving; the state tax collection is still underway

The Mac can retrieve the money sources that the cloud could not reach.
Seven datasets now compile locally with source periods, units and original missing-value markers.
These files prepare calibration data; they do not change anyone's money in play.
Official state withholding files are saved for 48 of 51 state and D.C. targets, but they do not yet form a current numeric rate corpus.
The owner does not need to decide anything for this checkpoint.

## What is measured

The source compiler produces the following observations. The commands in Method reproduce these counts.

| Source                             | Measured result                                                                                                                                            | Evidence                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| BLS CPI                            | 490,922 observations, including national spending categories and the publisher's summary geographies                                                       | `scripts/source/regional-money/missing-money-sources.ts:475` |
| EIA electricity and gasoline       | 310 electricity, 2,860 annual state/U.S. gasoline and 1,884 weekly U.S. regular-gasoline observations; six no-data weeks stay null                         | `scripts/source/regional-money/missing-money-sources.ts`     |
| Federal Reserve household finances | 13 published national transaction-account medians, grouped separately by age and income                                                                    | `scripts/source/regional-money/missing-money-sources.ts:597` |
| Census trade                       | 28,314 observations retaining suppressed and unavailable cells                                                                                             | `scripts/source/regional-money/missing-money-sources.ts:648` |
| Census government finances         | 511,362 observations for 24,520 government units                                                                                                           | `scripts/source/regional-money/missing-money-sources.ts:721` |
| Freddie Mac mortgages              | 5,792 weekly rate observations, including missing historic fifteen-year quotes                                                                             | `scripts/source/regional-money/missing-money-sources.ts:808` |
| IRS 2026 tables                    | 76 rows: 28 annual individual tax-liability brackets in four filing schedules and 48 automated payroll withholding brackets in six filing/Step 2 schedules | `scripts/source/regional-money/missing-money-sources.ts:883` |

Measured: the full finance identity file contains 1,100 blank fiscal month/day entries.
The source-only importer preserves those blanks and original line numbers; it reuses the existing amount and dated-identity parsers (`scripts/source/regional-money/missing-money-sources.ts:721`).

Measured: the acquisition wrapper calls the existing receipt-writing client.
It keeps publisher bytes, URLs, retrieval instants and SHA-256 hashes (`scripts/source/regional-money/missing-money-sources.ts:349`).

The IRS rows come from the saved [2026 annual bracket bulletin](https://www.irs.gov/irb/2025-45_IRB) and [Publication 15-T](https://www.irs.gov/publications/p15t). A married joint return's first annual bracket ends at $24,800 of **taxable income** with a 10% rate. The automated payroll table's first married-joint, unchecked Step 2 bracket ends at $19,300 of **adjusted annual wages** with a 0% rate. Those are different inputs and computations. The source corpus retains both original rows and their table locations (`scripts/source/regional-money/missing-money-sources.ts:883-993`); the focused test checks their distinct units, boundaries and unbounded top brackets (`scripts/source/regional-money/missing-money-sources.test.ts`). No withholding formula, W-4 adjustment, pay-period conversion or tax liability has been applied to a person.

The state source plan contains 50 states and D.C. The saved lock has 48 original files with byte hashes. Michigan, New Hampshire and Tennessee originals are still absent. The [New Hampshire Department of Revenue Administration](https://www.revenue.nh.gov/taxes-glance/interest-dividends-tax) says it has no income tax on reported W-2 wages, and the [Tennessee Department of Revenue](https://revenue.support.tn.gov/hc/en-us/articles/360057595051-GEN-34-Income-Tax-Withholding) says it has no state income tax on earned income and therefore no withholding requirements. These web-read statements explain why a wage-withholding table is unavailable for those states; they are not acquired originals, numeric rate rows, or a claim that either state has no other taxes. D.C.'s saved table is from 2015, and Ohio's is from 2025; they do not prove 2026 current rates. Indiana's saved document takes effect October 1, 2026, after this checkpoint's date. Colorado's document is from 2026, while the Wisconsin guide was revised in 2026 but its cited rates took effect in 2022. The acquisition dates and stated vintages remain in `data/source/state-revenue-tax-rates/money-artifact-lock.json` and `source-plan.json`. The state documents carry unresolved rights metadata, so they are research inputs, not an accepted production rate corpus.

## What remains

Job 3 is partial. Michigan's state withholding original, source receipts for the New Hampshire and Tennessee no-table findings, numeric state-rate normalization, remaining source compilers, and coverage reconciliation remain open.
The original missing county figures have not been filled by this work.
American Samoa, Guam, the Northern Mariana Islands, Puerto Rico and the U.S. Virgin Islands have no separate observations in these seven new normalized corpora. National figures are not represented as territory-specific estimates.

The NASBO and JPMorgan reports were retrieved, but their original bytes and receipt locks are now preserved outside this public repository while rights remain unresolved. They are not accepted as production inputs. The earlier public WIP branch for #710 already contains those originals in its history; this replacement branch omits them, but does not erase that historical exposure. Claude CTO owns its disposition.
The federal student-loan catalog supplied an older workbook; acquisition of the current student-aid URL failed. Massachusetts' official Circular M PDF was retrieved with a plain curl GET after the shared client's bot user agent received HTTP 403. Its lock records the actual retrieval time, 279,731 bytes and SHA-256 digest.
The saved multiseries weekly gasoline workbook is still not normalized. An additional official [EIA SEDS annual price CSV](https://www.eia.gov/state/seds/seds-data-complete.php?sid=US) supplies the `MGTCD` motor-gasoline average for all sectors in dollars per million Btu, with a byte-bound receipt and source row/column references. Separately, the official [EIA weekly U.S. regular-gasoline history](https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=EMM_EPMR_PTE_NUS_DPG) supplies 1,884 dated observations in dollars per gallon, including taxes. Its six published no-data weeks remain null. The weekly page does not supply state prices; the annual energy measure is not a weekly pump price. The 14 missing housing and business figures in ten counties remain blank.

Claude will review the completed job at its exact pull-request head before merge.
Jobs 1 and 2 follow this job in separate pull requests.

## Method

The clean receiving branch is `codex/assignments-5-money-sources-safe`, based on cloud Team C head `b685834b9020892673c8e92dfad75ebe4bdbec96`. It contains only source files permitted for this public repository. The earlier draft #710 branch remains preserved for rights disposition. The table describes source files on this branch, not features on main. The last named main head seen before this handoff was `f4d50a1f3ab34a4684ab8e20e7f65e297320d6e6`.

At the published `350a629d7` checkpoint, the offline compiler check verified locked publisher bytes and deterministic outputs for seven corpora. The focused source test passed nine checks, including IRS schedule separation and the state-guide inventory. At `546d840b3`, the offline check again verified all 48 locked state originals and seven compiled corpora. The New Hampshire and Tennessee URL edits did not add locked state originals.

The weekly U.S. gasoline addition passed the offline corpus/lock check with 5,054 EIA observations and six EIA artifacts. The focused source suite passed 11 checks; targeted ESLint, Prettier and the report checker passed. Full typecheck failed on the preserved unrelated untracked rail test's missing import, with no error reported in the new source compiler. The weekly addition is compiled locally at this checkpoint.

The full typecheck failed on a preserved, unrelated untracked rail test whose imported module is absent from this base.
No file was removed or hidden to make that check pass.
No browser run or Day timing was performed for this source-only checkpoint.
Runtime wiring and ordinary-play acceptance remain untested.
