# DESKTOP-CLIENT1 — installed Mac/Windows client

Owner: Cursor Grok 4.6 Medium continuation on isolated branch
`cursor/desktop-client1-continuity-3b75`. Preserves PR #156 lineage
(`claude/desktop-client1-electron` @ `5a062f44`) rebased onto current
`origin/main`. Does not take over UI/LAND/modular worktrees.

## Continuation (2026-09-12)

- Rebased the seven #156 commits onto current main without rewriting that
  branch. PR #156 remains the preserved Electron implementation.
- Compile-time client provenance: `npm run build` stamps
  `dist/client/.build-provenance.json`; staging refuses a HEAD/hash
  mismatch unless `--rebuild`. `accepted-main` cannot be the default
  composition on an unmerged working tree.
- Portable `.ocd-life.json` export/import on the existing Saved games
  screen (new slot only). World transfers; interface state transfers when
  the UI-bearing `interface` store exists, otherwise recorded unavailable.
  Candidate-preview exports are refused in production.
- Close/update: window close waits for an actual `closed` event. A
  timeout is not persistence; a blocked flush does not force quit.
- Candidate people: production packages still cannot show
  `?art-preview=candidate`. A separately compiled internal art-review
  package (`VITE_OCD_BUILD_PROFILE=internal-art-review`, `DEV=false`)
  uses the existing Visual4 preview libraries, an isolated database, and
  a distinct userData directory.
- Linux cloud packaging is not Mac/Windows launch proof. CI remains the
  macOS/Windows runner path.
- Root Vitest excludes `desktop/**` (those suites use Node `node:test`).
  Save-transfer player copy is registered as computed `shell/save-transfer`
  prose.

## What exists

- `desktop/` — self-contained shell (own package.json + lockfile):
  `main.mjs` (hardened main process, `app://game` protocol, disabled
  direct-update seam, native About), `scripts/stage.mjs` (stamps build
  identity from canonical version + actual revision),
  `scripts/continuity-test.mjs` (installed A→B proof harness),
  `electron-builder.yml` (unsigned internal targets, signing hooks).
- `.github/workflows/desktop-package.yml` — read-only Mac/Windows CI
  packaging with checksums and exact source identity; no publication.
- `docs/release/changes/desktop-client1.md` — impact `none` (no released
  game behavior changes; no desktop build published to players).
- Details and operator instructions: `desktop/README.md`.

## Proven (Apple Silicon, unsigned, dev server stopped)

- Packaged app launches from `app://game`, renders the real title
  screen, full creator → begin → play → keep flow.
- Installed A → saved life → installed B (distinct prerelease fixture
  version `0.2.0-continuity.2`; canonical version untouched) → same
  life: 16/16 checks — byte-identical save payload (sha256), same
  worldId/person/name/age/residence/calendar moment/history position,
  save generation unmoved by opening, Continue offered.
- Zero renderer requests left the packaged origin in both runs (the
  offline claim's mechanism: there is nothing to fetch).
- Security negatives: `../` and encoded traversal → 404; external fetch
  blocked by CSP; no Node globals in the renderer; window.open denied;
  notification permission denied; navigation to https:// prevented.

## Not verified / honestly labeled

- Windows x64 NSIS installer is cross-built on macOS and has NOT been
  launched on Windows. Intel Mac output can be cross-built and is
  likewise untested. CI packaging on a real Windows runner exists but a
  runner build is not launch proof either.
- Signed Mac automatic update: NOT VERIFIED (no credentials; hooks
  exist). Updater logic ships disabled/unconfigured; Steam-output mode
  hard-disables it.
- Browser (Safari/Chrome) saves do not appear in the desktop app
  automatically. Transfer is the Saved games export/import file on this
  branch. Pins/private journal persist when the same-life transfer includes
  the `interface` store (this branch opens IndexedDB at version 2).
  An explicit world-only import still refuses to invent that store.
- Candidate preview remains DEV-gated in the UI-bearing source; a
  production installed build must not be described as showing that cast.

## Update gates (all deliberately closed)

No GitHub Releases publication, no update feed endpoint, no Steam
AppID/upload, no RELEASE_AUTOMATION change, no reserved-version
promotion, no signing purchase.

## Composition note

The desktop-only PR carries accepted main. An internal candidate
containing the newer UI is composed separately and disposably (UI #144
head + this desktop delta, identity stamped with an explicit
`composition` field and a prerelease fixture version) and is never
represented as accepted main or opened as a PR.

## Repair/completion pass (2026-09-09, second session)

- Windows CI: the desktop packaging job died in `npm run build` because
  the shared run-artifacts guard (`scripts/dev-lab/run-config.ts`)
  requires the POSIX `test-results/` prefix, which a Windows checkout
  path cannot produce. Fixed workflow-locally by pointing
  `PG_ARTIFACTS_DIR` outside the checkout (`runner.temp`), a case the
  guard explicitly supports; the guard itself is untouched.
- A→B matrix completed on packaged builds: identity, Journal (real
  surface), calendar (day surface + saved moment), people rail,
  money/resources (payload container digest; accepted main has no money
  HUD), history, appearance where rendered, generation, offline origin.
  Disclosed boundaries: pins are shell-session state on this source (no
  pinned key in the payload; same in browser); no wardrobe choice exists
  on accepted main. Nothing was fabricated to close either gap.
- Save failure/compatibility controls (`save-integrity-test.mjs`):
  hard-kill interruption recoverable; corrupt record and newer-schema
  (downgrade) record refused but byte-preserved; healthy life continues
  beside them. Existing repository semantics only.
- Update contract: seam extracted to `desktop/updater.mjs` with 17
  deterministic tests (`npm test`) — disabled/unconfigured, Steam
  hard-disable, malformed metadata, untrusted channel, downgrade,
  failed/partial download, verification failure, Not now, Later
  (now truly arms install-on-next-quit, matching the dialog copy),
  Restart-and-install, and blocked-close deferral. Logic proof only;
  signed Mac automatic install remains NOT VERIFIED.
- Version staging: tracked `desktop/package.json` version is a fixed
  placeholder; `scripts/package.mjs` injects the staged canonical
  version via electron-builder `extraMetadata`. No tracked file is
  mutated by staging; artifact names, app version, and About identity
  agree.
- Per-OS runtime proof: `smoke-test.mjs` (launch → new life → keep →
  relaunch → continue, `--shell` adds resize/fullscreen/minimize/
  restore/clean-quit — all PASS locally on the packaged Apple Silicon
  build). CI now runs it on the macOS runner build and, on Windows,
  against the client installed by the actual NSIS installer (silent
  install to a temp dir), distinguishing installed-installer proof from
  a mere cross-build.
- Disposable UI #144 composition (ff0a5b32 + this desktop delta,
  fixture 0.2.0-ui144cand.2) proved the packaged protocol serves its
  lazy runtime resources offline: education manifest + all three
  catalog chunks (6.7/60.6/11.4 MB) with sha256 integrity verified in
  the secure app:// context, and the economic-context v1 manifest +
  a BEA county shard. Still disposable; not part of this PR.
