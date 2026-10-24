# Golden-path regressions and core performance

The checks report accepted regressions and slower core changes. Unaccepted
features remain visible as goals. The CTO approved the contract and deadlines;
the separate finisher owns acceptance. Game behavior and roadmap tests are
unchanged by these tools.

## Run and read the checks

- Golden path: `node --import tsx tests/golden-path/runner.mjs --output /tmp/golden-path.json`.
  Add `--nightly` for the longer deadline. `--commit` reproduces a failing draw.
  Receipts also record the actual checked-out source revision.
- Performance: `node --import tsx scripts/core2-guard/paired.mjs --base BASE --head HEAD --output /tmp/core2-paired.json`.
  Start with a clean registered checkout. The tool switches revisions
  in turn, then restores the original branch or detached commit.
- Detector tests: `node --import tsx --test tests/golden-path/runner.node-test.mjs scripts/core2-guard/compare.node-test.mjs scripts/core2-guard/paired.node-test.mjs`.
  Run heavy commands through the repository storage wrapper in the cloud.

An accepted command failure, timeout, or missing command is red. Goal failures
are nonblocking and never flip acceptance flags. Zero registered commands is
reported explicitly; it does not mean the game passed its roadmap tests.
Accepted commands run first. Deadline expiration kills command descendants and
marks commands not reached. Both string shell commands and argument arrays are
supported; commands are trusted repository configuration.

Each command receives these environment bindings:

- `GOLDEN_PATH_SEED`: reproducible generation seed.
- `GOLDEN_PATH_PLACE_KEY`: recorded locality key.
- `GOLDEN_PATH_SPEC_ID`: the registered spec ID.
- `GOLDEN_PATH_COMMIT`: commit used to derive the seed.
- `GOLDEN_PATH_MODE`: `pr` or `nightly`, so a test can run longer at night.

Registered tests must use those
bindings to build their world. Selection hashes the tested commit and spec ID,
draws from all 56 jurisdiction identities, then draws a recorded locality.
Receipts include the full seed, place, command, exit status, time, and bounded
failure output. The runner never writes the feature registry.

The performance guard runs only for PRs touching the core, and nightly.
It measures the played world: the bench's two-level town with the economy and
every module the bench installs (`buildBenchWorld`, opening October 12, 2026),
the same path as `tests/golden-path/played-world.node-test.ts`. A revision
whose bench can't hand over its opening input falls back to the generated
opening; `settings.playedWorld` records which path ran.
One warmup and up to three independent measured processes run per revision,
one process at a time, base and head alternating so the machine's drift falls
on both. Each run plays a whole year, so a large drawn town can take minutes a
run: after the first measured pair, another pair starts only while the last
pair's time times `runTimeMargin` still fits the time left, and each profile
(the head's first) only while its last run's time times `profileTimeMargin`
does. A large town then measures one or two pairs instead of failing on time;
the summary names how many. The same seed, place, opening-input hash,
settings, host, and month horizon must match; incomparable runs fail
explicitly. Median simulation milliseconds per day (the mean of the middle two
for two pairs) determine the ratio. Initialization and opening
phases are reported separately. A ratio above 1.20 is red. A failed opening-input budget is also red,
independently of timing. Valid measurements still report both components when
the baseline already exceeds an input budget. The relative year
estimate uses the matched month; it is not a full-year two-minute proof.

Peak RSS includes the whole process. The core's existing opening-input byte
and Source-share budgets are enforced directly. No new RSS ceiling is invented.
Separate CPU profiles reuse the existing summarizer and name slowest functions;
profiled timings never enter the comparison. Profiles include opening and month.
The tsx profiler reports transpiled line numbers; function names and source
file paths identify the hot code.

The PR deadline is five minutes; nightly is thirty minutes; paired measurements
have forty-five minutes. The tagged policy table links to
[CTO approval](https://github.com/lamontaes/Political-Game-Git/pull/3941#issuecomment-6102566030).
GitHub summaries are short; artifacts contain compact receipts, not worlds.

## Deliberate-failure proofs

`prove-golden.mjs CORE_REVISION /tmp/contact-proof.json` runs an explicitly
provisional step-2 detector overlay. It uses existing contact and relationship
boundary tests plus an opening in the drawn place. A temporary contact-producer
break must turn the suite red; restoring it must pass. This does not register
or accept the full 91-day and multi-year M0-07 test. The CTO registers that test
when the people package supplies it.

`prove-performance.mjs CORE_REVISION /tmp/speed-proof.json` measures the core,
introduces real CPU work at its clock boundary, measures again, and requires
red. It removes the temporary break, runs the ordinary clock again, and checks
the real opening-input guard with an oversized fixture.
Both proof tools need a named branch; they fail on a detached HEAD.
They require a clean checkout and restore the original source and branch in finally.
Neither temporary break is committed.

Main does not yet contain the core. Until it lands, proofs use the latest
approved core branch and record its exact revision. Missing core dependencies
fail explicitly. These tools do not provide a second engine or change core,
director, or rule modules.

## Measured handoff

The [provisional contact proof](evidence/golden-path-proof.json) passed before
the real producer break, went red with it, and passed after restoration. Each
command fit the approved five-minute budget. This is detector evidence, not
acceptance of the full meeting-people spec.

The [performance proof](evidence/performance-proof.json) measured a ratio of
1.990 against a limit of 1.20. The restored source patch and input hashes match
the baseline. The existing Source-share budget fails in that drawn baseline:
75.87 percent against 74.91 percent. That failure remains red independently of
timing. The core owner must address it; this package changes no core budgets.
The oversized-input fixture also failed the existing byte budget.

The [missing-core check](evidence/missing-core.json) exited red and restored
the checkout when main supplied no core. Roadmap commands remain unregistered.
Both specs await separate Sonnet finishing; acceptance flags stay unchanged.
