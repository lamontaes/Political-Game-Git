# Money sources are arriving; the state tax collection is still underway

The Mac can retrieve the money sources that the cloud could not reach.
Six datasets now compile locally with source periods, units and original missing-value markers.
These files prepare calibration data; they do not change anyone's money in play.
State withholding tables are being collected next.
The owner does not need to decide anything for this checkpoint.

## What is measured

The source compiler produces the following observations. The commands in Method reproduce these counts.

| Source | Measured result | Evidence |
| --- | --- | --- |
| BLS CPI | 490,922 observations, including national spending categories and the publisher's summary geographies | `scripts/source/regional-money/missing-money-sources.ts:475` |
| EIA electricity | 310 observations across states, D.C., regional totals and the U.S. total; all 51 state/DC rows are present | `scripts/source/regional-money/missing-money-sources.ts:540` |
| Federal Reserve household finances | 13 published national transaction-account medians, grouped separately by age and income | `scripts/source/regional-money/missing-money-sources.ts:597` |
| Census trade | 28,314 observations retaining suppressed and unavailable cells | `scripts/source/regional-money/missing-money-sources.ts:648` |
| Census government finances | 511,362 observations for 24,520 government units | `scripts/source/regional-money/missing-money-sources.ts:721` |
| Freddie Mac mortgages | 5,792 weekly rate observations, including missing historic fifteen-year quotes | `scripts/source/regional-money/missing-money-sources.ts:808` |

Measured: the full finance identity file contains 1,100 blank fiscal month/day entries.
The source-only importer preserves those blanks and original line numbers; it reuses the existing amount and dated-identity parsers (`scripts/source/regional-money/missing-money-sources.ts:721`).

Measured: the acquisition wrapper calls the existing receipt-writing client.
It keeps publisher bytes, URLs, retrieval instants and SHA-256 hashes (`scripts/source/regional-money/missing-money-sources.ts:349`).

## What remains

Job 3 is partial. The full state withholding collection, remaining numeric compilers, and coverage reconciliation remain open.
The original missing county figures have not been filled by this work.
The five territories are reported separately; national figures are not represented as territory-specific estimates.

The NASBO and JPMorgan reports are retrieved as original files, with rights unresolved.
They are not accepted as production inputs.
The federal student-loan catalog supplied an older workbook; acquisition of the current student-aid URL failed.
The IRS tables and gasoline workbook are retrieved but are not yet normalized.

Claude will review the completed job at its exact pull-request head before merge.
Jobs 1 and 2 follow this job in separate pull requests.

## Method

Working branch: `codex/assignments-5-money-sources`, based on cloud Team C's `b685834b9020892673c8e92dfad75ebe4bdbec96`.
Live main was `f4d50a1f3ab34a4684ab8e20e7f65e297320d6e6` when checked with `git ls-remote origin refs/heads/main`.
The table describes this branch's new files, not features on main.

Run `node --import tsx scripts/source/regional-money/missing-money-sources.ts --compile`, then `--check` in place of `--compile` to reproduce and compare the files.
Run `npx vitest run scripts/source/regional-money/missing-money-sources.test.ts --configLoader runner` for the focused checks: seven passed.
Targeted ESLint passed before the latest source-plan additions and will be rerun before publication.

The full typecheck failed on a preserved, unrelated untracked rail test whose imported module is absent from this base.
No file was removed or hidden to make that check pass.
No browser run or Day timing was performed for this source-only checkpoint.
Runtime wiring and ordinary-play acceptance remain untested.
