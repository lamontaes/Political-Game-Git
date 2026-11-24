# RECOVERY25 CIVIL integrator handoff

Receiver: existing A/main integrator. This branch is a reconciliation and must
not be independently merged into another shared checkout.

## Pins

- Donor PR #178: `claude/civil-authority13-public-employment` at
  `49bccb3a06114d4d23c847deefb45ab548371d13`.
- Reconciliation base: `origin/main` at
  `cc83c628707be429839c53c536181ceb65647735`.
- Delivery branch: `codex/recovery25-civil`.
- Tested head: recorded in the published PR after final validation.
- Runtime substitution: the available Codex runtime completed RECOVERY25; the
  requested Sol Medium runtime was not available to this task.

## Precise current adapter

The old patches against UI head `302e1f0c` are superseded. Consume the branch
as one tested unit; do not reapply those patches.

- `src/presentation/new-game.ts`: the additive `NewGameStartingLife` union
  retains `ordinary-life`, `legislative-office` and `judicial-office-practice` and adds
  `state-agency-director`; the mutually exclusive state-agency initializer runs
  after the ordinary World and judicial initializer path.
- `src/presentation/new-game-identity.ts`: replay decoding accepts all four
  tokens.
- `src/presentation/setup-questionnaire-flow.ts`: judicial and state-agency
  starts both map to the existing ordinary-life questionnaire context.
- `src/player/PlayerGame.tsx`: the Custom background step derives availability
  from the selected state's canonical jurisdiction and the minimum age, renders
  the native `state-agency-start` button beside the judicial choice, and clears
  only an incompatible legislative/state-agency selection after a place
  change. No new root, route or navigation system is added.
- `src/presentation/civil-personnel-evidence.ts` and
  `src/player/CivilPersonnelPanel.tsx`: structured cause plus an actor-known,
  tagged canonical event deterministically supplies the existing #178 meeting
  note/reasons payload and visible notice preview. Missing evidence is an
  explicit unavailability; no new record family or personnel engine exists.

## Preserved behavior

The donor merge preserves its reviewed authority designations, civil and labor
separation, exact actor/state/class/date/agreement refusals, generated
employment and charter, deterministic appeal/settlement/reinstatement choices,
person-employer decision keys, integrity checks and snapshot round trip. The
normal route still begins 2026-01-05 and reaches the 2026-09-06 procedure
boundary only through ordinary time passage.

## Verification and acceptance

Final commands and the exact tested head are copied into the published PR.
Focused source/simulation/presentation/import/persistence tests, typecheck,
lint, build, full validation, required art gates, component browser proofs and
the real creator-to-save/reopen browser route are required before handoff.

Automated desktop acceptance is complete when those gates pass. Human visual
acceptance remains separate. The existing compact Day overlay can intercept
the time-passage control, so compact normal-route acceptance remains assigned
to UI-core rather than being repaired here.

## Resume verification — 2026-09-12

Recovered implementation head: `15c4541f2f5e9fd395e055d62ecd3c62d31916d6`;
remote already contained that same head on entry. Current main was verified at
`215b3e90d163ed3344dbbd36bfaa621501bd67f8`.

`recovery25-civil-current-registration.patch` contains only the additive creator
registration and applies cleanly to that current main PlayerGame. A owns its
composition and merge. Consume the feature dependency files listed above with
this adapter; never replace current PlayerGame with the donor's whole file.
The successor PR preserves the original donor merge ancestry.

LEARN: a stopped recording is not publication truth. Verify actual local and
remote heads before reconstructing work or repeating an already fixed problem.

Fresh continuation checks: 39 focused tests (6 files), typecheck, lint,
release:check, production build, validate:art, inventory:art and qa:art passed.
The frozen browser run `recovery25-civil-frozen` passed all 3 tests with its
checkout identity guard: Custom Minnesota start, January refusal, ordinary time
passage to September, reinstatement/NPC answer/save/reopen, and structured
cause/evidence notice plus pointer/keyboard activation of procedural actions.
An earlier run passed assertions but failed teardown because handoff docs were
edited during execution; it is superseded by the frozen run.

The additional `npm run validate` passed format/lint/typecheck/release checks;
its full Vitest phase was stopped without a result. Do not count it as a fresh
full-suite pass. Original worker separately reports its prior serial suite at
15c4541f: 4518 passed, 2 skipped, with six loopback EPERM tests separately
passing with permission. Those are original-head proofs, not current-main
composition or human visual acceptance. Compact Day-overlay interception
remains assigned to UI-core. No other fresh CIVIL failure remains.

## DELIVERY28 current-main reconciliation

Current main on entry: `2d154752aa38c9b94227b53ecfffb2db58081f9a`, containing
merged #227 and its newer title/place/appearance and preview-start caller.
Frozen isolated composition: `5bdf68c8855913af82c4f65bbc0d0caab65b09f9`, parents
current main and preserved #223 `151422197495a0e61ace9c4d6480d0cd9a5772da`.
The feature branch carries this tested composition without merging main.

The updated current-registration patch is the exact additive PlayerGame delta
against that main. It preserves newer beginLife preview/replay logic,
appearance, title and place controls. Feature dependencies remain those listed
above; no personnel engine was reconstructed. Newer main's generated prose
reports are retained and both architecture audit records preserved.

Fresh scoped verification: 50 tests in 7 files passed, covering source import,
creator/replay, ordinary dates, wrong authority/state/class/date and agreement
refusals, known/tagged evidence, deterministic accepted/declined NPC answers
and exact save integrity. Typecheck and lint passed. Browser run
`delivery28-civil-current`, port 4298, passed all 3 tests with frozen identity
(49.5 seconds): newer Custom MN creator -> January refusal -> ordinary days ->
reinstatement -> actual NPC answer -> save/reopen, plus structured notice
preview and pointer/keyboard discipline/filing controls. Structured-action
component scenarios are explicitly authored; the ordinary start does not
invent a misconduct record to make discipline available.

The first production build failed with ENOSPC. Only disposable CIVIL dist
outputs were removed; partial checkout-copy files were preserved in
/private/tmp/delivery28-civil-partial-copy before the branch copy was retried.
Original artwork and other owners' work remained untouched.

Human visual acceptance and final current-main merge remain with A. This run
proved desktop at 1440x1000; it did not clear the historical compact Day-overlay
finding. No new root/Day defect was observed in the supported desktop route.

LEARN: freeze proof source during browser identity checks, write receipts in
the separate feature checkout, and check disk capacity before copying large
receiver compositions. Never treat a disk failure as a passing build.

Production build passed on retry and stamped proof revision 5bdf68c with
production profile. All three required art gates passed; the proof checkout
remained clean after generated QA. Release:check, changed-document formatting
and git diff --check passed. No new full-suite run is claimed for DELIVERY28.
The delivery successor changes only documentation relative to the tested
composition; src/scripts/tests/package files match the frozen proof exactly.
