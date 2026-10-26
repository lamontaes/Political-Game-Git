# Mods change content and rules without touching the engine; the permanent Mac app updates itself; secrets stay out of the repo (bank id b31, Session 55)

Phase "Ship it" · Unlocks the Steam-era game: authors add scenarios, laws and institutions; players keep one installed app that stays current. Code checked at origin/main 2e7ac6cef (Oct 6).

## What the player experiences

Install one Mac app once. When it opens it checks for an eligible update, downloads it, and starts the new version on the next open without a manual install; one current version and one fallback stay on disk, saves are untouched. Add a mod (a content pack) and it can add or replace life scenes, traits, characters, dialogue, artwork, policy vocabulary, institutions, laws' effects and balance numbers. A broken mod is reported by name and skipped; the rest of the game plays. A mod can never reach files, the network, credentials or a raw save.

## Owner decisions it rests on

- OCD-CONTENT-004 (Sept 22): "mod authors should be able to change what they want except the machinery that makes the game function"; broad scope includes "content, scenarios, characters, traits, dialogue, artwork, policy vocabulary, institutions and simulated rules, outcomes/effects and balance"; "Deliberate, identified overrides of built-in content/rule definitions must be supported"; conflicts skip and report the unsupported handler, keeping valid pack content; no arbitrary filesystem, network, credential or raw-save permission.
- Register (client): "Keep one permanent client that automatically receives eligible updates on opening and safely activates them without per-build manual installation. Retain one current installation and one rolling fallback, not an expanding build archive."
- Owner: secrets only through env or GitHub secrets. Zero dice; one law system, laws as data rows; one writer per record kind; delete what you replace.

## Existing code to extend (verified)

- Mod container: `src/simulation/runtime-content-packs.ts:7 CONTENT_PACK_API = "ordinary-scenes-v1"`, `:9 RuntimeContentPack` (only `scenes`, `durations`, optional `traits`; authority "authored-fiction"), `:112 assertRuntimeContentPack`, `:260 parseRuntimeContentPack`, `:269 registerRuntimeContentPacks` (max 32, digest identity), `:360 installRuntimeContentPack`, `:374 runtimeLifeScenes`; trait rows `installed-trait-packs.ts:206 installedTraitPacks` (malformed row skipped with reason); import path `src/presentation/content-pack-import.ts` (test `content-pack-import.test.ts`); scenes read at `presentation/life-scene-flow.ts:53,164`.
- Other pack seams (compiled): `policy-pack-registry.ts`, `law-consequence-registry.ts:28 createLawConsequenceRegistry`, `legislature-rule-packs.ts` (`rulePackById`), `compiled-trait-packs.ts`, `trait-packs.ts`. Nothing yet lets a mod add rows to them.
- Desktop shell: `desktop/updater.mjs:24 updateActivation` (active only if `update-config.json` has `enabled` and an https `feedURL`; Steam builds off), `:87 assessCandidate`, `:122 runUpdateCheck` (notify-only, never silent), `desktop/main.mjs:124,145-165` (electron-updater with `autoDownload = false`, `autoInstallOnAppQuit = false`, generic feed), `desktop/scripts/stage.mjs:157` writes `{enabled:false, channel:"internal", feedURL:null}`, `desktop/electron-builder.yml` (`publish: null`, stable appId `com.ourcivicduty.desktop`: never change), `desktop/runtime-content.mjs:86 validateContentManifest`, `:157 receiveContent` (hash-verified art content), workflows `.github/workflows/desktop-package.yml`, `release.yml`.
- Secrets: `.gitignore:13-15` ignores `.env`; workflows pass values via `env:` (`audit-scan.yml:42`, `release.yml:42,92`).
- Newer code covering part: none; there is no update feed, no mod rule rows, no secret scan.

## Build steps (one PR each)

1. **Packs carry rows, not code.** Raise `CONTENT_PACK_API` to a new version that adds typed row sections: `policyRows` (vocabulary and positions), `institutionRows` (offices, bodies, rule values as the data the rule packs already hold), `effectRows` (law consequences as data rows in the registry's own shape), `balanceRows` (numbers by key), `characterRows`, `dialogueRows`. One loader validates each section against the same schema the compiled data uses, merges by id, and refuses code, URLs, paths and callbacks. Old packs keep loading.
2. **Declared overrides.** A row with `overrides: "<built-in id>"` replaces that built-in; a collision without it is a conflict. Conflicts and malformed rows are skipped with a named reason, shown in a mod list; valid rows still load. `Replaces:` the scenes-only parser limits where a row type now exists.
3. **Machinery stays closed.** One list of protected machinery (ids and time, history writer, validation, save and replay, resource accounting, isolation) enforced in the loader; a pack touching it is refused as a whole row. Mods are applied at world open and stored in the save with digests (existing `WorldContentPacks`), so replay is identical.
4. **Mod list and import.** One import path (existing `content-pack-import`) and one settings list showing installed packs, versions, overrides and skipped rows. No store, no network fetch in this PR.
5. **Auto-update that activates.** Turn on the feed: `update-config.json` gets its https feed URL from a build setting; on open the app checks (existing `runUpdateCheck`), downloads (`autoDownload` true for the stable channel only), verifies the signature and version (`assessCandidate`), and installs on next quit/open. Keep exactly one fallback copy and delete older ones; never touch `userData` or saves (identity unchanged). Steam builds stay off. Private/internal builds keep their selector.
6. **Secrets only by env.** Add a repo scan (script + test) that fails on key-like strings, `.env` files, private keys and signing certs in tracked files; the app reads feed credentials only from env or GitHub secrets at build time (signing identity, notarization via secrets), never from a file in the repo. Document the secret names in `desktop/README.md`.
7. **Proof that nothing else moved.** Existing saves load; the packaged app opens a new game; mod and update tests pass.

## Must not build

A mod store or online download; scripting or code in mods; filesystem, network or credential access for mods; a whitelist of "favored" effects; a second parser per row type (one schema, the compiled data's); an update archive; changing appId or productName; secrets in files, workflows or logs; per-build manual install steps.

## Research tables

In repo: OCD-CONTENT-004, desktop README. One search each, 10 minutes: electron-updater generic-provider auto-download with macOS signing/notarization requirements (electron.build docs); Steam mod and Workshop conventions only as reference. No numbers needed; cadence of update checks = one setting (default: on open).

## Done when (played-game proof)

A test mod adds one policy question, one institution rule value and one balance number and overrides one scene; a new game in a random place shows all four; a second mod with a bad row is listed as skipped with its reason and the game still plays; a save made with mods reloads identically. The packaged Mac app updates from version A to B on a local test feed (https via a local test certificate or the unit-test harness), keeps A as the fallback, and the old fallback is deleted. Secret scan passes on main and fails on a planted fake key in a test. Tests: `runtime-content-packs-rows.test.ts`, `mod-override-conflict.test.ts`, `mod-machinery-protected.test.ts`, `desktop/tests/auto-update.test.mjs` (extends updater tests), `secret-scan.test.ts`.

## Proof to post

`docs/codex/evidence/b31-mods-and-updater/`: the test mod file, the mod list output, a before/after of the random place, the updater run log A to B with fallback listing, the secret scan failing then passing, `npm run typecheck` and the changed tests.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
"Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building."
Open owner questions: the public update feed host and Apple signing identity (owner's accounts). Switch: `update-config.json` fields (`enabled`, `feedURL`, `channel`) are build settings; with no feed the app behaves as today (notify-only) and every code path is tested against a local test feed. Signing and notarization credentials are GitHub secrets whose names are listed in the README; the build runs unsigned without them. Which row sections mods may override = one data list `moddableSections`; the default is all of them.
