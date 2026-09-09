# DEV-LAB2 — disposable review hub and isolated harness

Owner: Codex, exclusive DEV-LAB2. Base: origin/main
`1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`, freshly fetched 2026-09-08.
Worktree: `/private/tmp/pg-dev-lab2`; branch: `codex/dev-lab2`.
Authority: shared delivery contract and section F, Drive
`1BQTTAZlOLQBVKQpzVGPfqEH8iD5kuH08aB8nIfibamc`, explicitly activated by owner.
The supplied historical stage gates are preserved for accepted semantics; the
current assignment authorizes developer tooling only.

## Reuse and ownership

- Reuse DeveloperViewer/PeopleList/PersonInspector, CausalTraceView, content,
  character, scene gallery/authoring/proof and production-office viewers.
- Reuse existing office/floor/legislation fixtures and canonical transitions;
  their authored prerequisites remain visible and never prove normal entry.
- BrowserSaveStore owns save decoding; add a read-only snapshot seam because
  normal load updates lastPlayedAt. Review clones use existing serialization,
  no new World schema, persistence migration or simulation engine.
- UI-CORE-RELEASE owns App/PlayerGame/production navigation. Deliver one exact
  optional development registration patch; a separate review entry enables
  verification without modifying that owner's files.
- PEOPLE1-R1 owns compositor/character art; ENV-ALL1 owns anchors/scene registry.
  Consume their existing interfaces with no art edits or approval claims.
- DEV-LAB2 owns identified launcher, Playwright isolation and artifact paths.

## Execution and proof

1. Build feature-local review session with clone/reset/exit, exact seed/source,
   existing person control and room/office/workflow selection.
2. Repair server identity, strict/configurable ports and URLs, run outputs,
   bounded workers and owned process shutdown; reproduce wrong-server refusal.
3. Focused unit/browser tests: no save writes, context navigation, real pointer
   and keyboard activation, two identified checkouts, historical evidence hashes,
   cleanup leaving unrelated server alive. Run required integration/art gates.
4. Record exact final head, observed CI and remaining human acceptance; one
   draft PR, unmerged, no monitoring. Encode lessons in regressions.

Known starting defects: pose-proof.spec.ts writes two historical tracked PNGs;
Playwright reuses any responsive server; non-CI workers are unbounded;
BrowserSaveStore.load mutates save metadata. The source checkout has two dirty
historical PNGs; it remains untouched. Disk preflight reports 2.1 GiB free;
reuse installed dependencies and keep temporary outputs bounded.

## First implementation checkpoint

Implemented the hub, read-only save snapshot seam, optional review-memory
adapters, exact UI-core registration patch, identity/port/output/seed guards,
per-run TypeScript and Vite cache isolation, and historical screenshot repair.
No App/PlayerGame, compositor/anchor/manifest, World schema or simulation
semantics edits.

Evidence so far (not final-head acceptance):

- Focused snapshot/session/harness run: 53 passed.
- Two real fixture checkouts served distinct Vite identities; mismatch,
  post-start source change, PID/cwd/port and owned cleanup proof: 1 passed.
- First browser run: 8 passed, 1 new-test assertion failed because the unchanged
  fixture has an actual volunteer relationship. Corrected that assertion to
  test the intended missing legislative seat; no control seed changed.
- Subsequent two-test browser run timed out before completing. Do not call
  those runs proof. Keep the same assertions/timeouts for isolated rerun.
- Full formatting and external-artifact-directory typecheck passed. Lint and
  remaining repository/browser/art gates are pending this checkpoint.

Shared machine: another owner's ENOSPC was confirmed locally at roughly
560 MiB free; later `df` showed 31 GiB free. No other owner's process/cache was
removed by this task. Live process evidence also showed full Claude-owned
validators/browser tests outside the Codex slot queue. Final validation remains
required; these observations do not reclassify failures as passes.

## CI repair and final local verification

Checkpoint CI `34297582583` at `d269c704dfe6baff9d8e1dc2be3a8d26294bca85`
ran the full unit suite: 3,207 passed, six failed, six pre-existing skips;
one additional suite failed during setup. The actionable failures were the
launcher's legacy banner contract, the explicit developer-route allowlist, and
source-coverage artifact drift. Restore the banner, retain player-facing
exclusion checks while registering the hub as a development-only entry, and
regenerate the existing coverage artifacts without changing corpus authority.

The existing launcher regression itself also had fixed shared ports and no
failure cleanup. It now allocates ephemeral ports and always cleans up only its
own child handles and test listener. No assertions or time limits were relaxed.

Final local retry: 56 of 64 focused tests passed; eight hit existing time limits
(one save test, five launcher tests, source identity, and real-server isolation).
Both hub browser tests failed under their original limits; one waited on saved
record evaluation, one on the lazy character-proof view. These are recorded
failures, not accepted proof. Earlier pose/browser evidence is retained under
its own run identity and is not relabeled as final-head evidence.

Source validation, byte-identical source replay and deterministic demo passed.
Formatting, lint, external-output typecheck, art validation and art inventory
had passed before the small CI repair. Production build (both entries) and
art QA have now passed without changing tracked art; updated typecheck/lint
remain pending at this recording. The PR body
is the final execution/CI status record. Human visual acceptance and optional
UI-CORE registration remain outstanding; no normal-player reachability claim.

LEARN: shared-machine isolation must cover legacy launcher tests as well as
Playwright configuration. Dynamic-port allocation, failure cleanup, exact
source refusal, read-only snapshot tests and historical-evidence hashes encode
that lesson in executable checks rather than additional operator prompts.

Cleanup verification found two fixture servers left behind when Vitest timed
out before the test body's `finally`. Verified their run-owned PIDs/cwds and
stopped only those wrappers. The isolation test now registers `onTestFinished`
cleanup and honors Vitest's abort signal before any further launch; cleanup
gives the wrapper its existing five-second child-escalation window. Assertion
deadlines stay unchanged. The repaired two-checkout proof passed, followed by
all 63 remaining focused regressions. Thus all 64 focused checks now pass on
the repaired source. Updated TypeScript/lint/format and the clean-head build
also passed before the final test-only cleanup change. Browser failures and
human/UI-core acceptance remain explicitly separate gates.
