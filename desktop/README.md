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

Packaging consumes `dist/client` as-is and refuses to run without it;
staging never builds the game. Nothing outside `dist/client` is packaged:
no `art/references`, no research archives, no repository metadata, no
secrets.

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
- Browser (Safari/Chrome) saves do NOT automatically appear in the
  desktop app — they live in the browser's own origin storage. The
  current build has no save export/import route in the game UI, so there
  is no validated transfer path yet; adding the thin export/import
  wrapper over the save store's string payload is UI-owner work, and the
  shell will not scrape or copy browser profiles as a substitute.
- `OCD_USER_DATA_DIR` redirects the profile for isolated automated
  tests only; it grants nothing else.

## Version and build identity

`scripts/stage.mjs` stamps `build-identity.json` from the canonical
repository `package.json` version and the actual git revision (plus a
dirty flag, distribution, and composition). The About dialog shows it.
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
  agreed to close through the normal close flow; a window that stays
  open defers the install instead of forcing it). Choosing "Later"
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
  (Gatekeeper: right-click → Open, or
  `xattr -dr com.apple.quarantine "Our Civic Duty.app"`), and **signed
  Mac automatic-update installation is NOT VERIFIED**.

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
- `scripts/smoke-test.mjs --app <exe> [--shell]` is the bounded per-OS
  runtime proof (launch → new life → keep → relaunch → continue;
  `--shell` adds resize, fullscreen on/off, minimize/restore, clean
  quit). CI runs it on the actual macOS runner build and on Windows
  against the client INSTALLED by the real NSIS installer.

```bash
node scripts/continuity-test.mjs --app-a <A executable> --app-b <B executable>
node scripts/save-integrity-test.mjs --app <executable>
node scripts/smoke-test.mjs --app <executable> --shell
```

CI packaging (`.github/workflows/desktop-package.yml`) is read-only:
mac and Windows runner builds with per-OS runtime smoke, checksums,
exact source identity, no publication and no secrets.
