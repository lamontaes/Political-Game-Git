# A month of Day actions can be reproduced from the recorded setup

The Ripon profile advances an ordinary generated life from January 5 to February 5. It measures each accepted Day action and retains its input, daily receipt and sampled CPU profile. It does not measure browser navigation or establish the historical annual speed target.

## Exact source and setup

The baseline simulation source is `f88508186b78f526ecf89a420b5fb584171e039a`. The candidate simulation source is `b68e5bb63a40232299e60da9aa3cf65ef7846de2`. Both use `ripon-input.json`: place `5568175`, seed `session5-one-month-3c40ddf2-3ead-4375-b68a-a9eedaf046ec`, normal start, age 40, female, January 1 birthday. No campaign or fixture records are inserted.

The original baseline ended at February 5 after 32 accepted actions across 31 calendar days. An action stopped within the same date. The executable permits at most 64 actions to reach that finite date; it never extends the window.

## Run in an existing registered workspace

Obtain these four executable/input files from the published profile branch and keep them together in a temporary directory. Their runtime imports resolve against `SESSION5_PROFILE_REPO`; they contain no private workspace paths. Pin the existing simulation checkout to the baseline or candidate above before starting. Do not switch a checkout while its simulation or typecheck is running.

```bash
SESSION5_PROFILE_SOURCE=$(git rev-parse HEAD) \
SESSION5_PROFILE_REPO="$PWD" \
SESSION5_PROFILE_INPUT=/tmp/shared-month-profile/ripon-input.json \
SESSION5_PROFILE_OUTPUT=/tmp/reproduced-ripon-month \
node scripts/storage/cli.mjs run test -- \
node --max-old-space-size=4096 --import tsx /tmp/shared-month-profile/run.mjs

node /tmp/shared-month-profile/summarize.mjs /tmp/reproduced-ripon-month
```

The four files are `run.mjs`, `instrument.mjs`, `summarize.mjs` and `ripon-input.json`. Use the repository storage guard. A deliberate storage override needs an explicit reason; this profile writes compact receipts and no full World save. Use a new or empty output directory for each run; the runner refuses prior artifacts rather than overwriting them. Do not raise the heap limit or run a second profile concurrently.

## What the receipts measure

The profiler samples at a 1 ms interval. Precise coverage is disabled; the run supplies no invocation counts. Each daily receipt records process user/system CPU, wall time, heap/RSS checkpoints, canonical action timing, accepted status, people and history sequence.

Appending history rows are counted and serialized individually to measure row-body bytes. Containers, changed existing rows and other World data are excluded. Those bytes are not canonical save size or retained heap attribution. Heap deltas include transient allocations and uncontrolled garbage collection.

Daily wall and process CPU include profiler setup, row accounting and receipt writes. The separate canonical phase measures `submitTimeCommand`, still with sampling overhead. Sampled percentages use all sample time, including Inspector and garbage collection. Inclusive function centers overlap and must not be added.

The original artifacts remain under `/tmp/session5-month-dispatch`. Their assembled baseline is checked into `docs/codex/evidence/session5-ripon-month-profile.json`. The first launch failed before generation on a sandboxed Git subprocess; the executable receives the externally verified source identity instead. No independent reproduction is claimed by copying this setup or its receipts.
