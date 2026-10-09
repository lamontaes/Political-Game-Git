# Normal-year median clears the target; workload and variance still limit confidence

Measured: The normal-circle annual median was 115.988 seconds (188.81 simulated days per minute), but the three runs ranged from 79.603 to 136.654 seconds. Inferred: This workload does not establish stable performance, realistic labor totals, or an event-driven civic chain. Next: broaden the actual circle and job model, prove the event-to-drive path, then measure steady memory and CI cost.

Before: Measured: The earlier county-wide daily cache receipt covers one day and says it does not establish annual throughput. [Earlier receipt:1–3](receipts/prototype-day-cache.json#L1-L3)

After: Measured: Three recorded circle members receive daily execution while all 10,002 residents remain indexed in the weekly tier. Inferred: This is a different workload, not a matched speed comparison. [Current receipt:250–264](receipts/prototype-normal-year.json#L250-L264) [Calendar:77–84](calendar.ts#L77-L84) [Proof limit:1025–1030](receipts/prototype-normal-year.json#L1025-L1030)

## Normal-year result

Measured: The run covered January 1, 2021, through January 1, 2022. It used one warmup and three fresh 365-day cores. [Current receipt:4–5, 35–40](receipts/prototype-normal-year.json#L4-L5)

Measured: The run times were 136.654, 115.988, and 79.603 seconds. The median was 115.988 seconds, or 188.81 simulated days per minute. One run exceeded the two-minute target. [Current receipt:163–241](receipts/prototype-normal-year.json#L163-L241)

Inferred: Three samples with a 57-second range do not establish stable budget performance. The variance needs explanation. [Current receipt:163–241](receipts/prototype-normal-year.json#L163-L241)

Measured: The receipt identifies the modeled place as La Homa, Texas, in Hidalgo County. [Place:1033–1038](receipts/prototype-normal-year.json#L1033-L1038)

Measured: The opening had 10,002 people, 3,955 households, 64 jobs, and 39 organizations. Only 252 of the 521,043 recorded acts were work shifts; the receipt says these totals do not establish realism. [Current receipt:250–264, 269–275, 1025–1030](receipts/prototype-normal-year.json#L250-L264)

Measured: Selected need and goal contributions each totaled 385,544.273 model units; selected drive contribution was zero. Inferred: The year did not demonstrate a generated event-to-drive chain. [Current receipt:443–447, 1025–1030](receipts/prototype-normal-year.json#L443-L447)

Measured: Process-lifetime peak RSS after serialization was 3,160.6 MiB. It includes input building, warmup, and prior runs, so it is not steady-state world memory. [Current receipt:243–249](receipts/prototype-normal-year.json#L243-L249)

Measured: The compact receipt records 140,078 person/month/action CSV rows and its hash. The full JSON, CSV, run log, and 29-file source manifest are now in the repository. [CSV metadata:18–28](receipts/prototype-normal-year.json#L18-L28) [Full JSON archive](receipts/prototype-normal-year-full.json.gz) [CSV archive](receipts/prototype-normal-year-person-month-actions.csv.gz) [Run log](receipts/prototype-normal-year.log) [Source manifest](receipts/prototype-normal-year-source-manifest.json)

Measured: The act-stat hash matches for the warmup and all three timed cores. It covers action counts and reason contributions, not whole-world parity. [Current receipt:145–146, 170–172, 194–196, 218–220](receipts/prototype-normal-year.json#L145-L146) [Hash scope:682–695](tooling/measure.ts#L682-L695)

## Changes and checks

Measured: The focus projection uses recorded family, known-person, household, and coworker links; it grants no actor knowledge. Public event retention separately checks the public-record flag and visible place IDs. [Focus projection:3–21](focus.ts#L3-L21) [State writer:275–299](state.ts#L275-L299)

Measured: The core2 API and schema versions are v3. [Version declarations:7–8](data.ts#L7-L8)

Measured: After fixture repair, the tripwire file passed 16 checks, the population gate passed 8, and the other eight focused files passed 125. That is 149 distinct passing assertions across ten files; the initial nine-file gate had one failed assertion before repair. [Initial gate:47–48](receipts/normal-year-gates/focused-gate.log#L47-L48) [Tripwire:14–15](receipts/normal-year-gates/tripwire-recheck.log#L14-L15) [Population:14–15](receipts/normal-year-gates/population-gate.log#L14-L15)

Measured: A separate boundary repeat passed 54 checks across three files. [Boundary recheck:14–15](receipts/normal-year-gates/boundary-recheck.log#L14-L15)

Measured: The scoped TypeScript check and changed-file ESLint completed without reported errors; formatting, zero-dice, and the PR release check passed. [TypeScript:1–5](receipts/normal-year-gates/typecheck-final.log#L1-L5) [ESLint:1–5](receipts/normal-year-gates/eslint.log#L1-L5) [Formatting:6–7](receipts/normal-year-gates/format-check.log#L6-L7) [Zero-dice:2–5](receipts/normal-year-gates/zero-dice.log#L2-L5) [Release check:2–5](receipts/normal-year-gates/release-check.log#L2-L5)

Measured: The audit reports 32 open stopgaps, 26 calibration references, 34 blockers, and no empirical calibration pass. Four generated-history targets lack an executable P8 replay route. [Audit:6–11](receipts/normal-year-gates/source-audit-final.log#L6-L11)

Measured: Any open stopgap blocks prototype release. [Release gate:39–50](stopgaps.ts#L39-L50)

## What remains open

Planned: First, expand the daily focus to 20–60 people using recorded relationships without granting extra knowledge. [Focus projection:3–21](focus.ts#L3-L21)

Planned: Second, improve job counts and shifts using county employment mix and American Time Use Survey evidence. The current 64 jobs do not establish realistic totals. [Current receipt:250–264, 1025–1030](receipts/prototype-normal-year.json#L250-L264)

Planned: Third, prove a normal generated event creates a drive and leads through real civic choices, then record one P9 life replay. This annual run did not establish that chain. [Current receipt:443–447, 1025–1030](receipts/prototype-normal-year.json#L443-L447)

Planned: Fourth, measure steady-state memory separately, set a CI runtime budget, and explain the run variance. The current RSS peak is cumulative across generation, warmup, and all runs. [Memory scope:243–249](receipts/prototype-normal-year.json#L243-L249) [Run samples:163–241](receipts/prototype-normal-year.json#L163-L241)

Measured: The compressed full receipt, action CSV, and 29-file source manifest are archived in the repository. The manifest was assembled after measurement from unchanged source bytes and recomputes the recorded digest. [Source manifest:1–7](receipts/prototype-normal-year-source-manifest.json#L1-L7) [Source hash:58–73](receipts/prototype-normal-year.json#L58-L73)

## Method

Measured: The run used seed `p8-real-life-cost-2026-10-09`, one warmup, and three fresh cores from the same prepared input. Timing includes initialization, the full year, monthly counter capture, hashing, affect sampling, and progress; world-summary validation and final serialization are outside the timer. [Run parameters:35–40](receipts/prototype-normal-year.json#L35-L40) [Timer scope:243](receipts/prototype-normal-year.json#L243)

Measured: The before/after source hash matched across 29 `src/core2` TypeScript and JSON files. Transitive code and data outside that directory were excluded; the prepared input has a separate hash. [Source and input hashes:58–73](receipts/prototype-normal-year.json#L58-L73)
