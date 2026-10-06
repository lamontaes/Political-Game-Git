# Session 48 routine outcome profile

## Independent baseline

- **Simulation source:** `f88508186b78f526ecf89a420b5fb584171e039a` (the registered checkout was pinned to this exact `origin/main` source).
- **Harness source:** Session 5 portable harness commit `30faa0af6` (published branch `codex/session5-month-dispatch-profile`; harness files extracted to `/tmp/session48-month-harness/session5-month`).
- **Command:**

  ```sh
  OCD_STORAGE_STATE_DIR=/tmp/session48-ocd-storage \
  SESSION5_PROFILE_SOURCE=$(git rev-parse HEAD) \
  SESSION5_PROFILE_REPO="$PWD" \
  SESSION5_PROFILE_INPUT=/tmp/session48-month-harness/session5-month/ripon-input.json \
  SESSION5_PROFILE_OUTPUT=/tmp/session48-ripon-baseline-20261006 \
  node scripts/storage/cli.mjs run test -- \
  node --max-old-space-size=4096 --import tsx /tmp/session48-month-harness/session5-month/run.mjs

  node /tmp/session48-month-harness/session5-month/summarize.mjs /tmp/session48-ripon-baseline-20261006
  ```

  The state directory override was needed because this runtime has no `/home/agent`; it kept the repository storage guard enabled. The first guard launch failed before simulation due to that missing directory; the successful invocation above used a fresh state directory. The output directory was new and remained unmodified after summarization.

- **Input:** published `ripon-input.json`: Ripon, Wisconsin (place `5568175`), seed `session5-one-month-3c40ddf2-3ead-4375-b68a-a9eedaf046ec`, ordinary normal start, age 40, female, Jan 1 birthday, Jan 5 to Feb 5 2026, no injected campaign or fixtures.
- **Process result:** terminal recorded; exit code 0; 32 accepted Day actions across 31 calendar days, ending 2026-02-05. World `world_5f9b74dcb02d14ae`, player `person_e54ea866a602ad62`.
- **Duration:** wall 138,437.602 ms; process user CPU 149,469.971 ms; system CPU 9,312.618 ms; sampled CPU profile total 136,095.092 ms.
- **Sampled self time:** `describeRoutineOutcome` 19,940.006 ms (14.6515%); `node:inspector.post` 15,075.713 ms (11.0773%); `familyCohortIndex` 11,809.115 ms (8.6771%). Inspector is included in the sample denominator.
- **Sampled inclusive time:** `submitTimeCommand` 116,750.163 ms (85.7857%); `run` 116,748.886 ms (85.7848%); `advanceStoppingForOfferDeadlines` 92,333.398 ms (67.8448%). Inclusive centers overlap and are not additive.
- **Heap:** first `heapUsed` 607,084,448 bytes; peak 2,122,224,608; last 1,508,842,456; peak RSS 2,432,925,696. These checkpoints include transient allocation and GC and do not attribute retained heap to a function.
- **Appended history:** 274,013 statutory tax liability rows, 197,738,059 serialized row-body bytes; 78,058 resource transfer outcomes, 56,986,468 bytes; 48,409 resource flows, 29,092,202 bytes. These are row-body measurements only, not save size or retained heap.
- **Raw receipts:** `/tmp/session48-ripon-baseline-20261006` (`terminal.json`, `summary.json`, 32 daily JSON receipts, and 32 sampled CPU profiles). The generated `summary.json` contains the complete raw top-function sets and per-day aggregates.

This is one independent headless reproduction of the published month harness. It does not measure browser rendering or establish a full-year speed result. The pre-change baseline identifies routine outcome formatting as the largest self-time function; the corresponding reader change and its after-profile will be added below after implementation.

## Independent after-profile: SP-02

- **Candidate source:** `0c0bfde2dd9d36351bd1b1170aa7293401a2c533` (the committed routine-outcome reader change).
- **Command:**

  ```sh
  OCD_STORAGE_STATE_DIR=/tmp/session48-ocd-storage \
  SESSION5_PROFILE_SOURCE=$(git rev-parse HEAD) \
  SESSION5_PROFILE_REPO="$PWD" \
  SESSION5_PROFILE_INPUT=/tmp/session48-month-harness/session5-month/ripon-input.json \
  SESSION5_PROFILE_OUTPUT=/tmp/session48-ripon-after-0c0bfde2-20261006 \
  node scripts/storage/cli.mjs run test -- \
  node --max-old-space-size=4096 --import tsx /tmp/session48-month-harness/session5-month/run.mjs

  node /tmp/session48-month-harness/session5-month/summarize.mjs /tmp/session48-ripon-after-0c0bfde2-20261006
  ```
- **Process result:** terminal recorded; exit code 0; 32 accepted Day actions, ending 2026-02-05. Same world ID and player ID as the baseline.
- **Duration:** wall 116,436.981 ms (-15.895%); process user CPU 126,743.611 ms and system CPU 6,606.832 ms; sampled CPU total 114,637.691 ms (-15.77% vs baseline).
- **Self time:** `describeRoutineOutcome` 95.529 ms (0.0833%), down from 19,940.006 ms (14.6515%). `node:inspector.post` was 16,802.949 ms (14.6574%), the top sampled self-time function after the change.
- **Inclusive time:** `submitTimeCommand` 93,698.627 ms (81.7346%); `run` 93,696.227 ms (81.7325%); `advanceStoppingForOfferDeadlines` 93,338.056 ms (81.4200%). Inclusive centers overlap and are not additive.
- **Heap:** first `heapUsed` 599,560,248 bytes; peak 2,476,949,872; last 1,542,515,512; peak RSS 2,822,856,704. Checkpoint deltas include transient allocation and GC; no retained-heap attribution is claimed.
- **Appended history:** the same deterministic aggregates as baseline: 274,013 statutory tax liability rows / 197,738,059 bytes; 78,058 resource transfer outcomes / 56,986,468 bytes; 48,409 resource flows / 29,092,202 bytes.
- **Raw receipts:** `/tmp/session48-ripon-after-0c0bfde2-20261006` (`terminal.json`, `summary.json`, 32 daily JSON receipts, and 32 sampled CPU profiles).

The two sequential samples on the same seed show lower elapsed and CPU costs, with routine outcome self-time falling below 0.1% of the candidate’s sampled total. This is a single profiled month per source, includes Inspector/GC and row-accounting overhead, and does not establish whole-year or browser performance. The change obtains only newly appended outcomes, uses the append-aware first-record history index for associated flows, and suppresses payroll lines using the same compensation/person/employer/date criteria as recorded stubs. Existing notice behavior tests and the complete repository typecheck passed before the candidate profile.
