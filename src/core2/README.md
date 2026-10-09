# Scheduled work misses two minutes; seven new stopgaps remain open

Measured: With opening allocation and scheduled work enabled, a year takes a median 143.410 seconds. All three years miss the 120-second target. The prototype now records more jobs and dated work, but funding, time-use realism and an ordinary event-born drive remain unresolved. The audit adds seven stopgaps, bringing the open count to 40. This prototype is **NOT READY**. [Enabled timing](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L578) [Open gaps](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L109) [Earlier audit](receipts/peer-circle-gates/source-audit.log#L1)

## Before

Measured: With both work switches disabled, the same v5 sources record 64 opening jobs and a 25-person circle. The annual median is 98.035758898 seconds, or 223.38787649 simulated days per minute. Legacy discretionary work remains available; its paid-work duration is uninstrumented. [Median](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L97) [Opening counts](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L209) [Duration limit](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L342)

## After

Measured: With both switches enabled, the opening records 1,433 jobs and a 57-person circle. The annual median is 143.410050858 seconds, or 152.70896195 simulated days per minute. The three measured years take 143.410, 131.210 and 149.882 seconds. [Opening counts](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L690) [Circle](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L703) [Median and runs](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L578)

Measured: The enabled world retains 10,002 residents, 3,955 households and 39 organizations. It records 837,144 acts and 32,043 durable records, all classified as circle-visible. The circle contains 34 workers at Megan's recorded employer, including Megan. These counts do not establish realistic employment or acquaintanceship. [Population](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L687) [Employer roster](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L704) [Retained visibility](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L713) [Proof limits](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L1129)

Inferred: The paired cost includes changed jobs, opening cash and the actual coworker circle. It cannot be assigned solely to the scheduler. The two inputs and circle ID sets differ even though the sources, seed, player and timer match. [Comparison scope](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L1123)

## Work and money that were recorded

Measured: The enabled year records 299,199 planned dated work segments: 272,610 attended and 26,589 absent. Attended primary work totals 89,964,270 minutes, or 1,499,404.5 hours. These units describe calendar-date portions and diary participation, not completed whole shifts. [Calendar](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L791)

Measured: Requested pay totals 1,783,763,800 minor units; actual pay totals 1,007,857,551 minor units. The unpaid difference is 775,906,249 minor units, or $7,759,062.49. Closed liquid cash has zero change, and the producer reports zero latest-receipt cash failures. Conservation does not establish funded employers or legal arrears. [Money](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L802)

Inferred from source: A scheduled worker chooses between attendance and absence through the shared chooser. The writer pays through the actual transfer return and links the result to the committed act ID. Quiet workers retain results and short reasons; full work detail follows player, circle or observer status. These rules remain prototype policies. [Attendance offers](modules/work.ts#L377) [Transfer and act](work-state.ts#L249) [Quiet result](work-state.ts#L280) [Detail scope](modules/work.ts#L295)

Inferred from source: Opening allocation appends jobs at recorded employers after preserving valid current paid jobs. Supplied county age cells inform the opening target; missing county observations use a tunable national proxy. Unsupported workplace and occupation mass remains omitted. Unassigned residents are not declared unemployed. [Current-job filter](population.ts#L576) [Append](population.ts#L653) [Rate selection](opening-employment.ts#L99) [Omitted-share limit](data/opening-employment.json#L74)

Inferred from source: The available county observation is a later-vintage ACS five-year estimate used as a fictional opening prior. It is not a historical employment count for January 2021, an employer headcount, or a work-hours observation. Original timetable patterns are explicitly authored game assumptions. [Survey application gap](data/resident-employment.json#L741) [Schedule provenance](opening-work.ts#L67)

## Age-based time use remains uncalibrated

Measured: The exposure denominator includes all 10,002 initialized residents across all 365 days, totaling 3,650,730 resident diary-days. Birthday changes determine each dated age bin. Nonworkers and quiet days remain in the denominator. [Exposure](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L728) [Exposure scope](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L1044)

Measured: Residents ages 35–44 contribute 647,757 diary-days and average 0.710655 paid-work hours per resident diary-day. The sourced ATUS age mean is 4.83 hours for the broader work and work-related category. This is a contextual gap; neither equality nor coefficient calibration is established. [Age result](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L912) [ATUS denominator](data/time-use-reference.json#L7)

Inferred: The prototype lacks a complete activity diary, commuting, job search, matched survey weights and civilian/noninstitutional eligibility. ATUS age means do not supply individual schedules or within-person spreads. Overnight attendance is decided for dated portions, so these counts cannot be called whole-shift completions. [Crosswalk limits](tooling/work-observables.json#L73)

Measured by root: Selected drive contribution remains zero. Inferred: This year does not prove the ordinary event-to-drive-to-civic-action route. The work module explicitly emits no financial-pressure event or civic drive. [Complete selected-contribution rows](receipts/prototype-v5-paired-work-year-20261009-enabled-person-month-actions.csv.gz) [Producer boundary](modules/work.ts#L421)

## Earlier isolated memory evidence

Measured: The earlier v4, 64-job baseline used three serial fresh processes, each with a full-year warmup. Its median was 74.475 seconds, or 294.06 days per minute. Its largest sampled RSS was 1,941 MiB without generation. Samples included the prepared input, initialization, day boundaries, warmup residue and monthly summaries. [Isolated median](receipts/prototype-peer-circle-steady-year.json#L6234) [RSS and sample scope](receipts/prototype-peer-circle-steady-year.json#L6237)

Inferred: The original GC observer lacked valid coverage before disconnection. Its empty arrays cannot establish no collection or explain timing variance. That original receipt remains preserved. The new work configuration still needs fresh-worker memory, CPU and corrected GC evidence. [GC limit](receipts/prototype-peer-circle-steady-year.json#L6239) [New memory scope](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L1118)

## Checks and remaining acceptance

Measured (root-observed) checks: The life/choice/tripwire group passed 37/37 tests, work/age observables passed 13/13, and opening/calibration/tripwires passed 27/27. The groups overlap and have no combined distinct-test total. The earlier 113/114 result remains a superseded failure, not a full pass. [Life/choice/tripwires](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L20) [Work/age](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L40) [Opening/calibration/tripwires](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L63) [Overlap](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L182) [Superseded failure](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L139)

Measured (root-observed) checks: Strict types, formatting, changed-file lint, zero-dice and the PR release check passed at the captured source. That last check does not mean the prototype is release-ready. The audit records 40 open stopgaps, 37 calibration references, 58 blockers and no empirical pass. [Strict types](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L73) [Format/lint](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L85) [Zero-dice and PR check](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L116) [Audit](receipts/prototype-v5-paired-work-year-20261009-gate-declarations.json#L109)

Inferred from source: Seven new open stopgaps cover opening staffing, missing county observations, authored schedules, attendance scoring, payment terms, time reserve and work-result retention. Any open stopgap blocks prototype release. [New entries](data/stopgaps.json#L399) [Release block](stopgaps.ts#L39)

Planned: Bring the full work year under the speed budget, establish employment and activity realism, and measure isolated memory and variance. Ordinary event-born civic action and acceptance f/g remain pending. The county pre-run and P9 life receipt remain open; the count and cash checks do not replace those proofs. [Performance](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L578) [Acceptance limits](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L1129) [Unimplemented mechanisms](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L1080)

## One busy day identifies a profiling lead

Measured: The actual July 2, 2021, advance records 10,797 acts in 1,586.255 milliseconds. Advance-stack samples total 1,514.004 milliseconds. The largest grouped leaf maps to `api.knows` at the original `state.ts:446`, with 223.465 milliseconds of self samples. `knownPublicTargets` has 252.046 milliseconds inclusive; those times overlap. These samples do not establish an annual speedup or GC coverage. [Actual day](receipts/prototype-v5-work-busy-day-before-frame-analysis-v2.json#L4) [Advance-stack samples](receipts/prototype-v5-work-busy-day-before-frame-analysis-v2.json#L12) [Mapped leaf](receipts/prototype-v5-work-busy-day-before-frame-analysis-v2.json#L42) [Inclusive group](receipts/prototype-v5-work-busy-day-before-frame-analysis-v2.json#L130)

## Method

Measured: Both modes use API/schema v5, seed `p8-real-life-cost-2026-10-09`, and recorded Megan McCoy, `person_5ddb09a9f5487640`. Each covers January 1, 2021, through January 1, 2022, with one warmup and three measured fresh cores. [Identity and dates](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L4) [Parameters](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L42)

Measured: Timing includes initialization, complete advancement, monthly counter capture and hashing, affect sampling and progress. Generation, world-summary validation and final serialization are outside the timer. Process-lifetime memory includes generation, warmup and earlier runs; it is not isolated steady-state memory. [Timer and memory](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L1117)

Measured: Both full captures, complete logs and person/month/action CSVs have verified gzip roundtrips. [Disabled capture](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L66) [Disabled log](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L94) [Disabled CSV](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L84) [Enabled capture](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L547) [Enabled log](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L575) [Enabled CSV](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L565)

Measured: The archived CSVs contain all 140,447 disabled and 158,792 enabled final person/month/action rows. The complete raw inputs remain at their recorded locations with exact hashes; they are not copied into the repository. [Disabled row count](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L72) [Enabled row count](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L553) [Disabled input](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L53) [Enabled input](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L534)

Inferred from source: Before archival output, the archiver checks detailed person, action and month/action totals against the final captured counters. [Counter admission](receipts/prototype-v5-paired-work-year-20261009-archiver.py#L429)

Measured: The 40-file executable core2 manifest and four direct legacy pins match across both modes and their before/after captures. Remaining transitive generation sources are outside that manifest and were not independently repinned. Latest work-receipt and retained-visibility checks remain source-reported aggregates; the captures do not serialize every such record for independent replay. [File count](receipts/prototype-v5-paired-work-year-20261009-source-manifest.json#L7) [Four direct pins](receipts/prototype-v5-paired-work-year-20261009-source-manifest.json#L210) [Before/after capture](receipts/prototype-v5-paired-work-year-20261009-source-manifest.json#L233) [Recomputed bytes](receipts/prototype-v5-paired-work-year-20261009-source-manifest.json#L234) [Coverage and receipt limits](receipts/prototype-v5-paired-work-year-20261009-comparison.json#L1132)
