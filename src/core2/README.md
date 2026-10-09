# A 25-person circle completes a year in 67 seconds; work realism remains open

Measured: The larger-circle annual median is 66.870 seconds, or 327.50 simulated days per minute. All three measurements finished under two minutes. Jobs, event-born drives, a memory budget, and variance remain open.

Before: Measured: The earlier three-person circle’s annual median was 115.988 seconds, or 188.81 days per minute. [Earlier median:235–241](receipts/prototype-normal-year.json#L235-L241)

After: Measured: The current 25-person circle’s annual median is 66.870 seconds. Its school acquaintances are an explicit generated prior. [Median:370–375](receipts/prototype-peer-circle-year.json#L370-L375) [Prior:4248–4253](receipts/prototype-peer-circle-year.json#L4248-L4253)

## Measured year and limits

Measured: The three year times were 66.870, 67.241, and 56.937 seconds. The run covered January 1, 2021, through January 1, 2022, after one warmup. [Runs:270–367](receipts/prototype-peer-circle-year.json#L270-L367) [Dates:4–5](receipts/prototype-peer-circle-year.json#L4-L5)

Measured: The opening is La Homa, Texas, in Hidalgo County, with 10,002 people, 3,955 households, and 64 jobs. [Place:6–16](receipts/prototype-peer-circle-year.json#L6-L16) [Counts:383–398](receipts/prototype-peer-circle-year.json#L383-L398)

Measured: The year produced 527,929 acts: 263,652 contacts, 173,072 rests, 70,006 lookups, 19,998 membership requests, and 1,201 work-shift choices. Those choices are not measured hours or complete work schedules. [Acts:402–407](receipts/prototype-peer-circle-year.json#L402-L407) [Activity-plan gap:4226](receipts/prototype-peer-circle-year.json#L4226)

Measured: Selected drive contribution was zero. Inferred: This year does not prove an ordinary event-born civic drive. [Reasons:627–632](receipts/prototype-peer-circle-year.json#L627-L632) [Proof limits:4253](receipts/prototype-peer-circle-year.json#L4253)

Measured: The process-lifetime peak after serialization was 3,101.7 MiB. It includes generation, warmup, and previous runs. [Memory:377–381](receipts/prototype-peer-circle-year.json#L377-L381)

Inferred: The different circle, input, and source prevent assigning the faster rate to circle expansion. The observed timing difference still needs measurement of CPU, garbage collection, and instrumentation. [Comparison scope:4241–4246](receipts/prototype-peer-circle-year.json#L4241-L4246)

Measured: The full JSON and 140,447 person/month/action CSV rows are archived with byte hashes and verified compression round trips. Counts reconcile by person and month/action. [Archives:18–33](receipts/prototype-peer-circle-year.json#L18-L33) [Archive verification:47–49](receipts/peer-circle-archive-check.log#L47-L49) [Full JSON](receipts/prototype-peer-circle-year-full.json.gz) [CSV](receipts/prototype-peer-circle-year-person-month-actions.csv.gz)

Measured: All four cores have matching act-stat hashes, covering action counts and reason contributions. This is not parity with the earlier input’s whole state. [Hashes:270–367](receipts/prototype-peer-circle-year.json#L270-L367) [Scope:4250](receipts/prototype-peer-circle-year.json#L4250)

## Isolated memory and CPU baseline

Measured: Three serial fresh processes each warmed a full year and then measured a fresh core. The median was 74.475 seconds, or 294.06 days per minute. [Isolated median:6234](receipts/prototype-peer-circle-steady-year.json#L6234) [Rate:6235](receipts/prototype-peer-circle-steady-year.json#L6235)

Measured: The largest sampled RSS was 1,941 MiB without generation. Samples include initialization, day boundaries, the prepared input, warmup residue, and retained monthly summaries. They do not isolate the core tables alone. [Memory:6237](receipts/prototype-peer-circle-steady-year.json#L6237) [Sample scope:6443](receipts/prototype-peer-circle-steady-year.json#L6443)

Measured: Process CPU totaled 88.309, 90.471, and 58.651 seconds across daily advance and boundary capture. Those totals include V8 worker threads. [First CPU:6277](receipts/prototype-peer-circle-steady-year.json#L6277) [Second CPU:17095](receipts/prototype-peer-circle-steady-year.json#L17095) [Third CPU:27913](receipts/prototype-peer-circle-steady-year.json#L27913)

Inferred: The original GC observer did not deliver valid coverage before disconnection. Empty arrays cannot establish no collection or explain variance. The original receipt is preserved, and corrected capture remains pending. [GC limit:6239](receipts/prototype-peer-circle-steady-year.json#L6239) [Variance limit:6244](receipts/prototype-peer-circle-steady-year.json#L6244)

Measured: The full isolated receipt is archived with verified compression round trip and source identities. The three cores have matching final-state hashes. This remains the 64-job baseline. [Archive:4–10](receipts/prototype-peer-circle-steady-year.json#L4-L10) [Source:35–49](receipts/prototype-peer-circle-steady-year.json#L35-L49) [First hash:6261](receipts/prototype-peer-circle-steady-year.json#L6261)

## Circle changes and checks

Measured: The opening reports 25 focus people, 253 generated contact records, and 22 school-peer IDs for the selected person. [Opening:4](receipts/peer-circle-opening-progress.log#L4)

Inferred: Those 22 peers plus the selected person form a generated group of 23. The producer writes one contact per unordered pair; focus also follows existing family, household, known-person, and coworker links. [Pair writer:287–330](opening-peer-network.ts#L287-L330) [Focus:4–21](focus.ts#L4-L21)

Inferred: Shared school-context estimates do not verify historical attendance, continued contact, or remembered names. Roster size and recognition remain uncalibrated priors. [Prior provenance:28–30](data/opening-peer-network.json#L28-L30)

Measured: The normal-circle daily/town-weekly setup is unchanged. All 25 circle members recorded 365 acts; other residents recorded at least 52. [Tier scope:251–256](tooling/measure.ts#L251-L256) [Earlier scope:44–55](receipts/prototype-normal-year.json#L44-L55) [Person totals:713–720](receipts/prototype-peer-circle-year.json#L713-L720)

Measured: Opening names retain owned, dated source facts through core creation and promotion. [Initialization:36–87,197–219](state.ts#L36-L87) [Promotion:711–750](state.ts#L711-L750)

Measured: The focused privacy check keeps another person’s pay hidden from those acquaintances. [Privacy:210–219](opening-peer-network.test.ts#L210-L219)

Measured: Public-event retention checks the public-record flag and visible place IDs separately from circle retention. [Retention:329–348](state.ts#L329-L348)

Measured: The baseline API and schema were v4. Its seven-file gate passed 134 checks. Strict types, changed-file lint and formatting, zero-dice, and the PR release check passed at that source. [Versions:117–118](receipts/prototype-peer-circle-steady-year.json#L117-L118) [Tests:14–15](receipts/peer-circle-gates/focused-gate.log#L14-L15) [Types:1](receipts/peer-circle-gates/typecheck.log#L1) [Lint:1](receipts/peer-circle-gates/eslint.log#L1) [Format:1–2](receipts/peer-circle-gates/format-check.log#L1-L2) [Guard:5](receipts/peer-circle-gates/zero-dice.log#L5) [Release:5](receipts/peer-circle-gates/release-check.log#L5)

Measured: The baseline source audit reported 33 open stopgaps, 27 calibration references, 36 blockers, and no empirical calibration pass. Any open stopgap blocks release. [Audit:1–5](receipts/peer-circle-gates/source-audit.log#L1-L5) [Release gate:39–50](stopgaps.ts#L39-L50)

## What happens next

Planned: Add actual employment and dated work schedules, then compare age-group time use with ATUS. The 64 jobs do not establish realistic employment coverage. [Employment limit:4251](receipts/prototype-peer-circle-year.json#L4251)

Planned: Prove the ordinary event-to-drive-to-civic-action route, set a measured memory budget, explain variance, and complete the county pre-run and P9 life receipt. Those proofs remain open. [Proof limits:4252–4253](receipts/prototype-peer-circle-year.json#L4252-L4253) [Budget pending:6245](receipts/prototype-peer-circle-steady-year.json#L6245)

## Method

Measured: The isolated timer includes core initialization, daily advancement, and boundary instrumentation. It excludes input parsing, warmup, final state hashing, reconciliation, and receipt serialization. This measurement scope differs from the monthly annual receipt; the rates do not establish a code speedup. [Isolated timer:6236](receipts/prototype-peer-circle-steady-year.json#L6236)

Measured: The run used seed `p8-real-life-cost-2026-10-09`, one warmup, and three fresh cores from the same prepared input. Timing includes initialization, the complete year, monthly counter capture, hashing, affect sampling, and progress. Final world-summary validation and serialization are outside the timer. [Seed:3](receipts/prototype-peer-circle-year.json#L3) [Parameters:47–53](receipts/prototype-peer-circle-year.json#L47-L53) [Timer:376](receipts/prototype-peer-circle-year.json#L376)

Measured: The captured 29-file core2 manifest and four direct runtime dependency hashes match before and after the run and recompute from unchanged bytes. Other generation and transitive imports remain outside the manifest and were frozen during measurement. [Manifest:40–45](receipts/prototype-peer-circle-year.json#L40-L45) [Source scope:129–187](receipts/prototype-peer-circle-year.json#L129-L187) [Captured manifest](receipts/prototype-peer-circle-year-source-manifest.json)
