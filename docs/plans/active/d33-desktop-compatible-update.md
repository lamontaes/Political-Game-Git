# D33 — existing private controller updates

Owner: existing Desktop task; Sol / High / Standard. A retains main merge authority.
Workspace: `/private/tmp/pg-desktop-d33-update`.
Branch: `codex/d33-desktop-compatible-update`; base `0f81acb6fa430c540a61a884cf4ff4ca850307f0`; initially no upstream, clean.

## Boundaries and first useful increment

Use the existing controller, worker and game close guard. No replacement wrapper,
gameplay writer, save codec, public feed, signing purchase or version bump.
A owns the minimal game-footer/What's changed adapter. Frozen private 5264,
its tree and ZIPs, installed 6e, last-good 9f and real profiles remain read-only.

First increment: show installed bundle identity separately from pointer and
controller source; disclose broken bundles; keep Play available during staging;
persist automatic/manual policy; automatically discover/stage accepted main in
the background, never as a consequence of Play. Stage-only completion leaves
activation to the existing explicit safe-close finish path.

Patch preview (implementation defaults, not prior human acceptance): automatic
checks begin 20 seconds after controller startup and at most once per six hours;
manual mode persists across restarts and cancels an automatic check already in
progress. Checks use only the configured trusted repository's accepted main.
No network, npm or full validation occurs on Play. No gameplay time/resources
change from controller browsing. Forks, failures and cancellation retain current.
The first compatibility policy is deliberately conservative: exact source
fingerprints of the existing World integrity/types and save/interface codecs.
UI/controller changes with unchanged surfaces qualify; a changed surface is
held for verified migration/admission, not branded incompatible forever.
This is a bounded controller admission adapter, not FOUNDATION's content-pack
loader or a new save format. Activation rechecks the staged compiled contract.

## Remaining installed delivery proof

- Compatibility/identity validation before staging or activation, including
  unsupported future contracts and feature/profile regression refusal.
- Last-good rollback and failed launch recovery, without profile mutation.
- Actual disposable same-semver installed A→B; two independently created lives,
  full World and v3 interface equality, normal durable close/reopen.
- Failure, offline, cancel, busy, refusal and rollback interaction checks.
- Exact controller/game compiled identities and retrievable artifact.

## Initial diagnosis (read-only, 2026-09-13)

Installed controller state digest `d7421f3c1d93ae87a0b9ee7feb3134c3a9e2d6926b5ec81d99721ea5ac8c827a`.
Pointer and actual resources stamp identify 6e227fb2a2a1d7d6b54173aaae1ed05f79892d78,
0.2.0, clean internal-art-review/direct/internal, client tree
ec029b1c9f4423654c503e1613ede157574676843cec35f32026de873b508eca.
Electron framework Current is an absolute link into a vanished old temporary
build; framework executable absent. This is not a semver diagnosis.
Read-only `gh variable get RELEASE_AUTOMATION` reports variable not found;
latest release run 34788185692 at public main 0f81acb6 is pending, not validated
or published. Public release is neither requested nor performed.

## Verification / handoff / LEARN

Preflight executed before edits: exact base above, zero dirty/untracked, sole
branch writer, thin isolated worktree; T has released its heavy window.
Focused receipts and real pointer/keyboard evidence will be appended by source.
Recurring defect: prose said Play did not wait while renderer disabled it during
Update. Encode the actual enabled-state contract in an executable regression.

## Frozen first increment and observed native tooling failure

First useful delta published as draft PR #242 at
4406bee0c01ef31d0090dc2b667b2cebfdd7c129. Exact clean-source 51 Node tests
(zero skips), typecheck, scoped lint and incoming release range passed;
pre-freeze art validation/inventory/QA and scoped format passed without changing
tracked art. A acknowledged receipt; no merge, human acceptance or real install.

Disposable native controller at that source actually discovered/refused a
non-descendant accepted target, retained the 5264 game pointer, and persisted
manual opt-out. One title-bar pointer focus restored a live screenshot matching
the actual checkbox and on-demand identity disclosure. Controller packaged-source
tree: 7cabe927918806834d9225235d893bf5a162a5708a176ca6eddbfff770d20b77.
Game bootstrap remains the unchanged compiled 5264/tree063.

Native tool app acquisition twice ignored a requested 30-second timeout
(583.684 seconds; Finder 7652.308 seconds). Further keyboard/window actions
reported noWindowsAvailable/cgWindowNotFound while the isolated controller
process remained alive. Background screenshots initially disagreed with fresh
AX state. Return/Space disclosure activation and Finder dialog navigation did
not complete. These are FAILED/INCOMPLETE proof cases, not harmless timeouts or
product crashes. No new acquisitions, wrapper rebuild, owner shutdown or real
profile fixture use follows. A acknowledged the gaps and directed continued
bounded rollback/activation source tests.

Second increment adds a testable production activation seam, source-bound
last-good rollback, held rolled-back source, actual discovered source receipts,
and serialization of explicit Play/activation (background staging remains
independent). Source tests do not establish full installed A→B or durable
two-life native continuity. Those remain required before owner installation.
Cancellation now signals only branded, freshly spawned controller process
groups with SIGTERM; unowned PID objects are refused and no force-kill fallback
or name/port-based shutdown exists. Controlled owned-Node cancellation and
activation/rollback negative tests pass. Total focused Desktop tests: 65,
zero skips. No full baseline suite or completed platform proof was rebuilt.
