# Our Civic Duty — desktop client (DESKTOP-CLIENT1)

An installed Mac application and Windows installer that open the compiled
game without Terminal, npm, a developer checkout, a Vite server, or an
internet connection. The shell is deliberately thin: it owns application
identity, a restricted packaged-content protocol, and the direct-update
seam — and nothing else. The game is the unmodified `npm run build`
output; there is no second UI, no second save system, and no game logic
here.

## Building

From the repository root:

```bash
npm ci && npm run build          # compile the game (dist/client)
cd desktop && npm ci             # desktop shell dependencies (separate lockfile)
npm run dist:mac                 # Mac .app + DMG + ZIP (Apple Silicon)
npm run dist:win                 # Windows x64 NSIS installer (cross-build on Mac)
```

Artifacts land in `desktop/release-artifacts/`. `npm run dist:mac-intel`
cross-builds Intel Mac output (untested until launched on an Intel Mac).
Rebuilding after newer accepted UI/game changes is exactly the same
commands — the wrapper does not change.

The private Apple Silicon delivery adds a separate controller app around a
verified internal-art-review build:

```bash
VITE_OCD_BUILD_PROFILE=internal-art-review npm run build
cd desktop
node scripts/stage.mjs --composition <honest-composition-label>
node scripts/package.mjs --mac --arm64 --dir -c.mac.target=dir
node scripts/package-private-controller.mjs
```

`Our Civic Duty Private.app` contains that exact verified game as its bootstrap
build. Install the controller once. From then on its visible **Play**, **Update**,
and **Finish Update & Play** actions own the private flow; the player does not
run Git or npm. The controller defaults to the known project location and has a
folder picker fallback. Update accepts only the configured GitHub repository's
`origin/main`, builds it in a clean versioned worktree, verifies revision,
profile and architecture, launches the packaged game through the smoke harness,
then atomically moves the Play pointer. Network loss, cancellation, build or
health failure, an unrelated/forked target, or a running game leave the prior
verified build active. It never swaps code beneath a running game.

Packaging consumes `dist/client` only when that tree's compile-time
provenance matches this checkout (source revision, dirty flag, and
content hash). Stale `dist/client` cannot be relabelled with a newer
HEAD. Pass `--rebuild` to `stage.mjs` to run `npm run build` and restage.
`composition: accepted-main` is refused unless HEAD is `origin/main`.
Nothing outside `dist/client` is packaged: no `art/references`, no
research archives, no repository metadata, no secrets.

## Candidate art in an installed build

A normal production package sets `import.meta.env.DEV` false. Appending
`?art-preview=candidate` to `app://game` will **not** show candidate
people. That is a production-safety fact, not a packaging bug.

A separately compiled internal art-review package is built with
`VITE_OCD_BUILD_PROFILE=internal-art-review` (still `DEV=false`). That
package turns the existing candidate compositor on, labels the play
screen, and keeps saves in `political-life-worlds-art-preview` plus a
distinct Electron userData directory. Steam and ordinary production
builds still refuse the URL flag. Do not treat a blank production
figure as the modular result.

## Identity, storage, saves

- App id `com.ourcivicduty.desktop`, product name `Our Civic Duty`. Both
  fix the profile directory (`~/Library/Application Support/Our Civic Duty`
  on Mac, `%APPDATA%\Our Civic Duty` on Windows) and must not change
  casually — changing either abandons player saves.
- The renderer origin is `app://game`, served by a restricted protocol
  from packaged resources with path-traversal fails-closed, strict CSP,
  and correct MIME types. A stable origin means stable IndexedDB, so the
  existing `political-life-worlds` save repository, its schema versions,
  migrations, generation/tombstone concurrency protocol, and its refusal
  of unreadable/newer records all apply unchanged.
- Saves survive reinstall and update because the profile lives outside
  the installation directory. Uninstall does not delete saves.
- Browser (Safari/Chrome) saves do NOT appear automatically in the
  desktop app. Transfer is a versioned `.ocd-life.json` file from Saved
  games → Export, then Import a saved life in the other origin. Import
  always creates a **new slot**; it never overwrites. The World (person,
  time, money, history, appearance) transfers. Pins, private journal, and
  wardrobe preferences transfer through the same IndexedDB `interface`
  store the UI shell uses. If that write cannot complete, the new slot is
  rolled back. Candidate-preview exports are refused by production
  imports; flipping the provenance label in the file is not admission.
  The shell does not scrape browser profiles.
- `OCD_USER_DATA_DIR` redirects the profile for isolated automated
  tests only; it grants nothing else.

## Version and build identity

`scripts/stage.mjs` copies a provenance-checked `dist/client` and stamps
`build-identity.json` from the canonical repository `package.json`
version, the matching git revision, the client tree sha256, distribution,
channel, profile, and composition. The About dialog shows it.
The tracked `desktop/package.json` version is a fixed `0.0.0`
placeholder that no build step ever rewrites: `scripts/package.mjs`
injects the staged version into electron-builder through
`extraMetadata`, so the packaged app version, artifact names, and the
About/build identity all agree with the canonical root version and a
clean tree stays clean before and after staging. The stage script never
writes the canonical version; scratch continuity builds may use
`--fixture-version 0.2.0-x.N` prerelease identifiers, which must extend
the canonical version and exist only for throwaway artifacts.

## Updates

- Direct updater (electron-updater, generic provider) ships **disabled
  and unconfigured**: `update-config.json` has `enabled: false` and no
  feed URL. Activating it requires explicitly writing an authorized
  https endpoint at stage time — a deliberate, reviewed act.
- "Check for Updates…" is finite and user-controlled: check → ask →
  download → ask again; nothing restarts on its own and unsaved play is
  never discarded (install-on-restart only proceeds once every window
  actually closed through the normal close flow after the game's
  unsaved-work guard; a timeout is not treated as persistence, and a
  blocked or failed flush does not force quit or claim a safe update). Choosing "Later"
  arms install-on-your-own-next-quit — exactly what the dialog says.
  Malformed metadata, an untrusted-channel candidate, a downgrade, and
  a failed or unverifiable download are refused and surfaced, never
  retried or silently installed. The whole contract is deterministic:
  `npm test` runs `tests/updater.test.mjs` against the extracted seam
  in `updater.mjs` (logic proof only — NOT signed automatic-install
  proof).
- Steam-output builds (`npm run dist:steam`, which stamps
  `distribution: steam` and produces bare directories suitable for later
  SteamPipe upload) **hard-disable** the direct updater regardless of
  configuration — Steam owns delivery there. No AppID exists and no
  Steam upload is implied. Channel policy: everything this tooling
  produces is `channel: internal`; a stable channel is a later, separate
  authorization, so internal candidates cannot silently migrate stable
  saves.
- Signing/notarization hooks exist in `electron-builder.yml`
  (`identity`, `hardenedRuntime`, `notarize`, or `CSC_LINK`/
  `CSC_KEY_PASSWORD`). Until credentials exist, Mac builds are unsigned
  (Gatekeeper may require the ordinary one-time right-click → Open
  confirmation), and **signed Mac automatic-update installation is NOT
  VERIFIED**. Do not disable Gatekeeper or remove quarantine broadly.

### Private controller versus public auto-update

The private controller is a developer-only local delivery for the owner's
existing repository and toolchain. Its command execution lives in the
controller process, behind six fixed IPC actions; the gameplay renderer and
ordinary packaged client still have no preload, IPC, filesystem, repository,
credential, or process surface. No repository token is stored or packaged.
Public signed in-place updating remains a separate external service boundary.

## Security posture

Renderer: `nodeIntegration` off; `contextIsolation`, `sandbox`,
`webSecurity` on; no preload and no IPC surface at all; all permission
requests denied; navigation restricted to `app://game`; `window.open`
denied (https links open in the OS browser); CSP allows only the
packaged origin. There is no filesystem or shell bridge, no remote-code
hot reload, and no self-patcher.

## Proof

- `scripts/continuity-test.mjs` launches two actually packaged builds
  against one isolated profile and proves installed A → saved life →
  installed B → same life across the whole supported state matrix:
  identity, Journal (real surface), calendar (day surface + saved
  moment), people rail, money/resources (payload digest — accepted main
  has no money HUD), history (action sequence + byte-identical payload
  sha256), appearance identity where a character surface renders, save
  generation unmoved, zero off-origin requests. States accepted main
  does not persist are DISCLOSED as boundaries rather than faked
  (pins are shell-session state; no wardrobe choice exists on main).
- `scripts/save-integrity-test.mjs` proves the existing repository
  semantics in the installed app: a hard-killed session's save stays
  recoverable; a corrupt record and a newer-schema (downgrade) record
  are refused but their bytes are preserved — never silently deleted —
  and the healthy life continues beside them. No second save-version
  system exists.
- `scripts/transfer-test.mjs` launches a packaged build, keeps a life,
  exports the portable file, imports it as a new slot, and checks that
  both lives remain. Unit tests cover malformed/newer/candidate
  refusals and two-life plus repeated-import slot identity.
- `scripts/smoke-test.mjs --app <exe> [--shell]` is the bounded per-OS
  runtime proof (launch → new life → keep → relaunch → continue;
  `--shell` adds resize, fullscreen on/off, minimize/restore, clean
  quit). CI runs it on the actual macOS runner build and on Windows
  against the client INSTALLED by the real NSIS installer.

```bash
node scripts/continuity-test.mjs --app-a <A executable> --app-b <B executable>
node scripts/save-integrity-test.mjs --app <executable>
node scripts/transfer-test.mjs --app <executable>
node scripts/smoke-test.mjs --app <executable> --shell
```

CI packaging (`.github/workflows/desktop-package.yml`) is read-only:
mac and Windows runner builds with per-OS runtime smoke, checksums,
exact source identity, no publication and no secrets.
