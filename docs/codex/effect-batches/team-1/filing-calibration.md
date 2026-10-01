# A member with weaker saved reasons can file a bill

Before: The old filing gate blocked a minority member even though their saved principles supported a proposal.

After: A common cutoff measured from the saved legislatures admits that controlled proposal. It does not create a quota. Pending-question and intake caps remain. The nationwide question opportunities are measured; actual session filings still need the cloud behavior run.

## MERGED

This is an independent calibration slice based on main `973a320f6e63fd8a46afd79f043c13c92f43f211`. Runtime source is `d41e8a47176459db115397abb195010e6f51aa8e`. The budget guard stack remains separate. No team merge occurred.

## WHAT EMERGED

DECIDED: In a controlled House fixture, minority member Cassandra Dunn's saved principles support a proposal with score 2.2875. The existing filer writes H.R. 43 with her as sponsor. It records the actual backing principle IDs. The old gate produced no bill for the same controlled strengths.

HARDWIRED: `src/simulation/governing/member-agenda-settings.ts:15` sets one common score cutoff of 1.575. It comes from the retained score distribution. The filer still chooses at most one best proposal per member and keeps one pending bill per question. This is a candidate calibration, not measured national bill throughput.

VITAL STATISTICS: The retained save has 7,780 seated members in 51 matched bodies. There are 503,456 measured member-question pairs. At 1.575, 59,969 pairs qualify, or 7.708 opportunities per member. This is not 59,969 filed bills. Six other jurisdiction rows lack joined seated-body coverage. Their absence does not prove actual vacancies or no real legislature.

## 1. Why-chain (five whys, to bedrock)

1. The minority member can file because their best supported question clears the common gate.
2. Its score exists because the existing reader combines their own saved principle strengths and the question's recorded weights.
3. Those principle records exist because the controlled fixture writes actual convictions for that seated person through the existing writer.
4. The proposed answer exists because the existing filer compares the person's leaning with the law in force and supported compiler inputs.
5. The bill is theirs because the existing filing survivor saves that actual seated member as sponsor. Bedrock: the person's own records and an available legal question.

Natural principle formation, missing numeric-change steps and national throughput are outside this proof. The calibration does not pick random sponsors or manufacture reasons.

## 2. Research

CTO's October 1, 3:54, 4:29 and 8:22 rulings admit one common threshold from the saved score distribution. The approved observations are Kansas about 3.7 bills per member per regular session, New Mexico 5.2, Kentucky 8.8 and Florida 11. Their median is (5.2 + 8.8) / 2 = 7.

The primary citations and locators are preserved in `data/research/lawmaking-throughput/team1-filing-threshold-calibration.json`. They reference the existing official Kansas summary, New Mexico session highlights, Kentucky action report and Florida regular-session statistics. These four snapshots are not a full national session series.

The script counts the saved member-question scores without advancing time or creating domain records. It considers positive absolute scores only. It chooses the inclusive cutoff with the smallest absolute difference from 7 multiplied by the 7,780 saved seated members. A tied error keeps the higher score; no draw is used.

The target is 54,460 opportunities. Cutoff 1.575 admits 59,969, an error of 5,509. The next higher observed cutoff, 1.61875, admits 37,505, an error of 16,955. Discrete score ties prevent an exact seven. This is an opportunity calibration, not an outcome quota or proof of actual median filings.

## 3. Revisions

The old value of 3 is replaced by the measured candidate. Every level setting reads the same constant. No per-state knobs, filing rates or drawn outcome levels were added.

The current state calendar supplies three ordinary intake dates. A member can offer at most one best proposal at each intake. That ceiling, pending questions, current-law answers, compiler support and regular-session authority constrain actual filings. Audit and CTO received this concrete caller limit. It is not silently removed to force seven bills.

Supported starting-law predecessors remain on their existing source stack. A missing researched numeric-change step is unsupported; no new amount or default is added here.

## 4. What gets built, in numbered parts

1. Read all 56 jurisdiction rows and Congress against the saved pack and roster joins; score only their actually joined seated members.
2. Publish the reproducible script, exact positive-score frequency distribution and each body's before/after opportunity counts.
3. Derive one inclusive positive cutoff against the approved median and document the tie rule and denominator.
4. Set the common filing gate to the measured candidate without changing the filer, session cadence or pending-question rule.
5. Extend the existing minority-member proof with weaker saved convictions, preserving the original strong-conviction case and its assertion.
6. Verify repeat, canonical Continue and pending-question preservation through the existing filer on current main.

## 5. Simulated, records, world pieces, checks

SIMULATED: The actual existing filer selects the controlled minority member's best supported question. This is not natural preference formation.

RECORDS: Existing principle and bill records retain the person's identity and backing source IDs. The calibration report counts opportunities and does not write bills into the retained world.

WORLD PIECES: A seated member, saved principle records, a legally answerable question, usable current law and supported terms still govern the filing. If no question is open, no proposal is manufactured.

CHECKS: Three strict roots have zero scoped and imported errors. Lint, formatting, whitespace and the exact release declaration range pass. Zero-dice reports zero new findings and five inherited stale removals. The report and spelling receipts are retained separately.

## 6. Proof run

Distribution seed: `team1-member-filing-20261001`, retained Villalba save, date January 5, 2028. Its full save hash is `3371b20fdc1baac3a887976776ee655c63aa9d556a181d288c29bd6753cc3c4d`. The full source path and imported source head are in the research artifact. The script is `scripts/world-report/filing-score-distribution.ts` and takes explicit save, output and head arguments.

The controlled fixture uses seed `minority-member-filing`. Its first new version read the wrong history field and failed before the intended filing check; that raw receipt is retained. After correcting the fixture reader, the old gate passed the strong case and failed the weaker case with zero bills. The same corrected fixture passed both cases after calibration.

The independent current-main composition passed both cases in 18.30 seconds. Cassandra Dunn is the actual saved Republican minority member. Her original score is 4.6; the controlled weaker records give 2.2875. Both runs preserve reload/repeat and prevent another pending bill for the same question.

No new year, browser, whole suite, speed or national jurisdiction-completeness run was executed. Actual per-state filed, floor, enacted and signed counts for the new gate remain NOT RUN. The existing two-year behavior entry point is available for the cloud/CTO runner; local long-year runs are forbidden.

## 7. Worked example

On February 1, Cassandra Dunn's controlled saved principles give score 2.2875 for proposition `proposition_ee54530967e5e26a`. Under the old gate, no bill is filed. Under 1.575, the existing survivor files H.R. 43 as `legislative-measure_2f93c7c7e3ddfb43` with her as sponsor and five actual backing principle records.

The case creates no appropriation, payment or delivered service. Reopening the save and repeating the same intake writes no second bill. A later intake does not duplicate the still-pending question. Passage and natural minority behavior are not claimed.

Method: The owned leaf setting, existing changed test, new read-only script, research artifact and declaration were first built on the preserved source stack, then received independently onto current main. The selected source readers and original leaf/test files matched before transfer. The test and strict-root proof ran on that actual main composition. Raw failures, successful logs, named proof and original hashes are under `filing-calibration-proof/`. Helpers remain forbidden, so the report received a self-review against civic-reports and feature-walkthrough. Next is exact-head review and the cloud behavior receipt; unsupported numeric-change steps remain with Audit.
