# JUD-WORK2 delivery evidence

Base: `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`.
Implementation and adapter proof head: `0fe6e894f4ab4b9bb61bdf2728cf374a039b0661`.
One isolated branch/worktree: `codex/jud-work2`, `/private/tmp/pg-jud-work2`.
Draft PR: [#139](https://github.com/lamontaes/Political-Game-Git/pull/139).

## Completed feature evidence

- Strict app TypeScript passed. Strict browser-proof TypeScript passed with
  `tsc -p tests/judicial-office/tsconfig.json`.
- Feature lint passed. The four-file UI-core patch applies cleanly to the base
  and passes app TypeScript in a separate scratch copy with the real assets.
  This found and corrected the questionnaire's narrow starting-life conversion.
- Focused run: 43/44 passed (22 consumer, five production-life and 17 unchanged
  compiler tests). The only failure was the spouse venue-request test exceeding
  its original five-second limit. The exact case, same seed and assertions,
  passed separately in 805 ms; the filtered retry skipped the other 21 cases.
  Do not report the combined run itself as 44/44 green.
- Earlier runs are retained as failures: expanded 20 had 16 pass/four timeouts;
  an initial fixture error incorrectly reused an existing household and a note
  artifact referenced another artifact where only entity/event IDs were valid.
  Those defects were corrected in feature code/fixtures. No accepted test,
  control seed or time limit was weakened.
- Final Playwright feature proof: one test passed in 16.1 seconds, one Chrome
  worker, unchanged 30-second limit, actual identified head/checkout on 5196.
  Earlier attempts failed first on an ambiguous test locator, then on the
  original time limit after exact IndexedDB reload. Both remain failed attempts.
- Actual proof includes read-only Work reopen, canonical person-link IDs,
  pointer/keyboard actions, response event and relationship contact, preparation
  note, saved World equality after page reload, accessible history, no page
  errors and no mobile horizontal overflow. Screenshots were inspected and
  deliberately copied to [the task's proof folder](jud-work2-proof/README.md).
- Independent civic-prose grounding re-review: PASS for the six bounded office
  adaptations. It previously caught assumed staff replies/attendance, missing
  alertness/inquiry premises, and falsely completed activity wording. The fixes
  preserve principal-only preparation and actual canonical activity status.

## Coverage and acceptance

Six adapted office workflows are supported when their actual people exist.
The Custom start normally provides five; SEED-49 additionally needs an existing
married and co-resident spouse. Four compiled intakes remain blocked by their
exact missing case/proceeding/rule relationships. Fifty bank entries retain their
individual mechanic gates. All 60 are accounted for by the runtime projection.
No court engine, ruling, remedy, recusal, reassignment, discipline, selection law,
ideology score or predicted outcome is delivered.

Normal-player reachability is awaiting **UI-CORE-RELEASE** adoption of the
[exact adapter](jud-work2-ui-core.md). The scratch copy proves compilation,
not adoption. Human visual/play acceptance remains pending. No deployment,
merge, release setting change or monitoring is authorized or performed.

## Repository integration gates

The sequential run passed repository formatting, lint and full `tsc -b`.
The complete unit attempt finished: **173 files passed / five failed; 3,223 tests
passed / 11 failed / six skipped; one unhandled error** (1,076.10 seconds).
All judicial consumer, production-life and unchanged compiler tests passed in
that full run. The run itself is not green.

The failures were:

- Four corpus CLI/crossbranch checks rejected stale generated coverage output;
  the count test also found the expected old pin (51,732 versus measured 52,167).
  Re-running the existing generator repaired four derived artifacts, without
  touching allocation history, anchors, inventoried templates or source inputs.
  Exact pins now match 52,167 literals, 1,914 inventoried entries and 347 files.
  `corpus:prose -- check` then passed (seven artifacts byte-identical; review
  packet differs only by its recorded head). The exact count test passed alone
  with 39 other cases filtered out. These specific repairs do not relabel the
  earlier full run as passing.
- Two legislative-bargaining tests exceeded their original five-second limits.
- Five launcher tests exceeded their original five-second limits; the same
  run recorded `listen EPERM` on 127.0.0.1:5196. The judicial browser proof was
  separately authorized to bind its local server and passed. No blanket timeout
  increase or test suppression was used.

The full run overlapped another owner's validator despite the earlier slot
handoff. It is not isolated evidence of a load-related cause. Source checks,
build/demo, all three art commands and one exact-head CI observation remain
pending at this checkpoint. LAND requested no new broad checks; the orchestrator
was paused while the unit child finished, then removed with no child remaining.
Its cleanup exit 137 is not the completed unit suite’s exit code. No task-owned
background process remains. The feature proof does not substitute
for those remaining gates.
