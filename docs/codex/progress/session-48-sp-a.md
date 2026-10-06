# Session 48 — SP-A routine outcome description

## Baseline cause and actual calls

- **Baseline:** `f88508186b78f526ecf89a420b5fb584171e039a`, published Session 5 profile packet #2424 comment `6014560601`, plus the independent Session 48 baseline receipts at `/tmp/session48-ripon-baseline-20261006`.
- **Actual route calls:** the portable month contains 31 accepted Day actions for calendar days 2–31 (action ordinals 1–31; calendar day 2 has same-date action 1 and advancing action 2). `time-command.ts::run` has one `describeRoutineOutcome` call in the common `days` path, and the harness submits one `days` command per accepted action. Therefore the route makes 31 calls over days 2–31 and 32 over the full month, including action 0/day 1. Session 5's separate precise-coverage matrix reports one actual entry on each high-cost weekly-payday row (calendar days 7, 14, 21 and 28). Precise coverage is used for counts only, never timing.
- **Measured cause:** the main-source `describeRoutineOutcome` eagerly builds a string on each route call. It calls `recordedPayStubs(after, personId)` over the accumulated history, then for every stub searches all newly appended transfer outcomes to decide whether to omit the paycheck. The four weekly-payday rows each add 19,428 outcomes; the repeated historical-stub/outcome matching is the high-cost work. It is not four calls per day or one call per simulation tick: each of those rows has one call, and the ordinary daily route has one call per accepted action.
- **Baseline timing source:** normal sampled CPU, separate from the precise-coverage run. Session 5 reports 21,471.676 ms self time across days 2–31 (15.38% of sampled time). The independent baseline's per-action CPU rows are retained in the receipt directory above.

## SP-A change and output contract

The accepted time-command receipt now derives its `outcome` string only when that property is read and memoizes the exact string after the first read. Simulation and saved history still contain the same facts; the existing routine-outcome description logic remains the source of the player-facing prose. The time-command runner reads the receipt for its player report, while the headless performance runner intentionally does not. Recent diagnostic receipts retain only bounded metadata and do not retain closures that capture World snapshots.

The focused regression verifies no description call before the receipt is read, one call on first read, cached text on later reads, and no outcome/world closure in the recent diagnostics. Existing command notice tests continue to exercise the assembled descriptions.

## Same-seed portable-runner proof

- **Setup:** published Session 5 Ripon input; seed `session5-one-month-3c40ddf2-3ead-4375-b68a-a9eedaf046ec`; place `5568175`; ordinary age-40 female start; 2026-01-05 through 2026-02-05; 4096 MiB heap bound.
- **Baseline source:** `f88508186b78f526ecf89a420b5fb584171e039a`.
- **Candidate source:** `f2ba0150488df213499e5cbffab5f106c14b76b9` (exact formatted runtime source used for the final candidate run).
- **Command for the candidate:**

  ```sh
  OCD_STORAGE_STATE_DIR=/tmp/session48-ocd-storage \
  SESSION5_PROFILE_SOURCE=$(git rev-parse HEAD) \
  SESSION5_PROFILE_REPO="$PWD" \
  SESSION5_PROFILE_INPUT=/tmp/session48-month-harness/session5-month/ripon-input.json \
  SESSION5_PROFILE_OUTPUT=/tmp/session48-sp-a-f2ba0150-20261006 \
  node scripts/storage/cli.mjs run test -- \
  node --max-old-space-size=4096 --import tsx /tmp/session48-month-harness/session5-month/run.mjs

  node /tmp/session48-month-harness/session5-month/summarize.mjs /tmp/session48-sp-a-f2ba0150-20261006
  ```

  The storage guard needed `OCD_STORAGE_STATE_DIR` because this runtime does not provide `/home/agent`; guard enforcement remained enabled. The baseline command, input, and first output are recorded in `docs/codex/progress/session-48-profile.md` and `/tmp/session48-ripon-baseline-20261006`.

- **Result:** both runs accepted 32 actions and ended 2026-02-05. The baseline and candidate had the same World and player IDs. Comparing each action's ordinal, accepted status, from/to moment, people count, and ending history sequence produced zero differences across all 32 actions.
- **Calendar-day CPU, days 2–31:** baseline total 154,657.818 ms / 30 days = **5,155.261 ms mean**. Candidate total 130,010.266 ms / 30 days = **4,333.676 ms mean**, a 15.94% decrease. Calendar day 2 groups its two actions, matching Session 5's day matrix; days 3–31 each contain one action. Measurements include the published runner's Inspector, receipt accounting, and other diagnostic overhead.
- **Raw candidate receipts:** `/tmp/session48-sp-a-f2ba0150-20261006` (`days.json`, `summary.json`, terminal record, 32 daily JSON receipts, and 32 CPU profiles). The baseline remains untouched at `/tmp/session48-ripon-baseline-20261006`. An earlier same-code pre-format iteration at `060470bd3e6ea70ace2dd79d9e8c5c09f6167595` is retained separately at `/tmp/session48-sp-a-060470bd-20261006` and is not used for the final metric.

This is the SP-A result only. Do not combine it with the earlier SP-02 draft's independent 138-to-116 second profile or with parked SP-01/SP-05 results. This headless month proves neither browser rendering performance nor annual, save/reload, or long-horizon performance.

## Main composition receipt

The SP-A branch was rebased onto current main `e591ffc63` (which includes root lint repair #2446). The routine-outcome source, focused test, and original performance receipt are byte-identical to the previously checked SP-A head `487706756266edb4d0f55eb54f558867fb3d9e0e`; the profile was not rerun because runtime behavior is unchanged. On the composed branch, the focused suite passed 14/14, changed-file ESLint passed, and Prettier passed. Full configured typecheck currently stops on two existing `src/simulation/press/press-premise.test.ts` errors (`PlaySettings.personalLifeDepiction` missing); full repository lint reports seven existing `no-undef` errors in `scripts/law-consequence-modules/generate-manifest.mjs`, added by #2456. Neither path is changed by SP-A. These baseline failures are being reported separately; they are not presented as green checks for this PR.
