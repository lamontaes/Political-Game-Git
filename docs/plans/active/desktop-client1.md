# DESKTOP-CLIENT1 — installed Mac/Windows client

Owner: dedicated desktop implementation session (DESKTOP-CLIENT1).
Branch: `claude/desktop-client1-electron` from accepted main
`efaa49a48bf65ebb929dc970bd1f057dfa5d618f`. Scope: a thin Electron shell
under `desktop/` around the unmodified compiled game — no game logic, no
second UI, no second save system, zero changes to the game's
package.json/lockfile/Vite config. Merge is LAND's; independent
acceptance is the reviewer's.

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
- Browser (Safari/Chrome) saves do not appear in the desktop app and no
  validated transfer route exists yet in the game UI; the minimal
  export/import belongs to the UI owner (`desktop/README.md` records
  the gap; the save store's string payload makes the wrapper thin).

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
