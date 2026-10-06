# Mod packs people can actually author: a sample pack, an authoring guide, the in-game mod list, a Workshop-ready folder (bank id b43, phase P6 "Ship it", gap G133, unlocks Steam-era community content)

Verified against origin/main a88744a25 (Oct 6).

## What the player experiences

You are a town councilmember in the middle of a game. You open Settings, then Mods. The list shows "Sample: Harbor Town Pack, version 1.0.0, by its author", what it changed in plain words (two life scenes, one policy question, one balance number, one overridden built-in), and a line for anything skipped: "Skipped 1 row: the scene 'night-shift' points to artwork that is not in the pack." You turn the pack off, start a new game in a random place, and the pack's content is gone; turn it on and it is back, with the same saved digest. Separately, a friend who writes a pack opens the guide, copies the sample folder, changes the words, drops the folder into the mods folder, and sees their pack in the list with its reasons if anything is wrong. Nothing they wrote can touch files, the network, a password or a raw save.

## Owner decisions it rests on

- Register, OCD-CONTENT-004 (Sept 22): "mod authors should be able to change what they want except the machinery that makes the game function."
- Same entry: "Deliberate, identified overrides of built-in content/rule definitions must be supported rather than namespace isolation becoming a blanket prohibition on changing them."
- Same entry: "Mods can change the rules evaluated by machinery; they cannot corrupt or bypass the machinery."
- Same entry: "Do not reduce this to prose, three approach words, three rooms or a small permanent whitelist of favored effects."
- ROADMAP-GAPS G133: "Modding packs people can actually author: a sample pack, an authoring guide, the in-game mod list, Workshop-ready layout (b31 builds the loader only)."
- No owner quote exists on Steam Workshop itself (grep of the register and both owner-words files finds none); the layout is therefore built as a folder convention only, no upload, no Steam call. Owner on secrets: only through env or GitHub secrets. Fixed rules: zero dice; nothing blank; one rule for all places; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (VERIFIED on a88744a25)

b31 (loader) is not yet on main: `CONTENT_PACK_API` is still `"ordinary-scenes-v1"` (`src/simulation/runtime-content-packs.ts:7`), and grep finds no `policyRows`, `effectRows`, `balanceRows`, `overrides` or `moddableSections` anywhere in `src`. Every b31 line cited below was re-checked and still holds.

- Pack shape: `runtime-content-packs.ts:9 RuntimeContentPack` (kind `"our-civic-duty-content-pack"`, id, version, title, authority `"authored-fiction"`, dependencies, durations, scenes, optional traits), `:112 assertRuntimeContentPack`, `:260 parseRuntimeContentPack` (size cap `:8 CONTENT_PACK_MAX_CHARACTERS` 128 KB), `:269 registerRuntimeContentPacks` (max 32 :272), `:360 installRuntimeContentPack`, `:374 runtimeLifeScenes`; saved with digest as `WorldContentPacks` (`:46`).
- Trait rows skipped with a reason, not a whole refusal: `installed-trait-packs.ts:206 installedTraitPacks`; reported through `traitRegistryFor(world).report.packs` used at `src/player/ContentPackWorkspace.tsx`.
- Import and a minimal list already exist: `src/presentation/content-pack-import.ts:9 importContentPack`; `src/player/ContentPackWorkspace.tsx` (paste or pick a file, shows installed pack ids and trait counts), mounted at `src/player/PlayerGame.tsx:4219`. It shows no versions, overrides, skipped rows or on/off switch.
- Desktop: `desktop/updater.mjs:24 updateActivation` (Steam distribution always off, `:25`), `desktop/runtime-content.mjs:86 validateContentManifest`, `:157 receiveContent` (hash check for art content; the closest existing pattern for a folder-of-files pack with a manifest).
- Compiled registries a mod must reach through b31's row sections, not around it: `law-consequence-registry.ts:28 createLawConsequenceRegistry`, `policy-pack-registry.ts`, `legislature-rule-packs.ts`.
- Does NOT exist on main: any sample pack file, any authoring guide (docs has none about packs), a mods folder scan, a pack manifest with artwork files, an on/off switch per pack, a validator command authors can run, a Workshop layout.

## Build steps (one PR each, in this order)

1. **One validator that explains itself.** A single function `explainContentPack(text | folder)` wrapping b31's loader checks; returns per-row verdicts in plain words ("row 3 of effectRows: the amount is not a number"). Files: new `src/simulation/content-pack-report.ts`; the same function backs the in-game list, the command line, and tests. Must not: a second parser; the report reads the loader's reasons, it does not invent its own.
2. **Folder layout and manifest.** A pack is a folder: `pack.json` (id, version, title, author, game version it was written for, which row sections it uses), `content/` (the b31 row sections as JSON), `art/` (images, hash-listed in the manifest like `runtime-content.mjs:157`), `README.txt`. Files: `src/simulation/content-pack-folder.ts` reads it into the one `RuntimeContentPack`. Refuses code files, URLs, absolute paths, `..`, symlinks, and any file not listed. Replaces: nothing; paste-in JSON import keeps working through the same loader.
3. **The sample pack.** `packs/sample-harbor-town/` that uses every b31 section once: one policy question, one institution rule value, one law effect, one balance number, one character, one dialogue row, one scene, and one declared `overrides`. Its numbers are copies of built-in values nudged and labelled "ESTIMATED FROM AVERAGE" in its README. It must load with zero skips in the shipped game and is the test fixture for b31's tests (move b31's ad hoc test mod here, do not keep two). Must not: invented places or people beyond what the pack declares; real names except public bodies.
4. **The in-game mod list.** Extend `ContentPackWorkspace.tsx` into the list: title, version, author, what it added and overrode, skipped rows with reasons from step 1, a per-pack on/off switch (applies at next new game or world open, as b31 step 3 says; the pack stays in the save with its digest), and a "mods folder" open button on the Mac app. Replaces: the bare id list and trait-count line in `ContentPackWorkspace.tsx`.
5. **Mods folder in the app.** Desktop scans `<userData>/mods/*/pack.json` at open through `desktop/runtime-content.mjs`-style hash checking and hands the text to the loader; a bad folder is listed as skipped, never crashes. No network. Files: `desktop/mods-folder.mjs`, `desktop/main.mjs` wiring. Must not: write outside `mods/`, read outside it, or touch saves.
6. **Authoring guide.** `docs/modding/AUTHORING-GUIDE.md` written from the sample: what you may change (everything except b31's protected machinery list, quoted from it, not retyped), each row section with a real worked example copied from the sample, how overrides are declared, how to read a skipped-row reason, how to test (`npm run mod:check <folder>`), the no-secrets rule. Plain words. A test fails if any code block in the guide differs from the sample file it cites.
7. **Workshop-ready layout.** `docs/modding/WORKSHOP-LAYOUT.md` and a script `npm run mod:package <folder>` that checks the folder, writes a clean copy (`pack.json`, `content/`, `art/`, a preview image slot, a description file) and a manifest of hashes, with no Steam SDK call and no upload. A one-line setting `MOD_PACKAGE_TARGET = "folder"` is the only target. Must not: store Steam keys or app ids; upload anything.
8. **No secrets in packs.** The validator and packager refuse key-like strings, `.env` files, private keys and tokens inside a pack (reuse b31 step 6's scan patterns, one list, not a copy). Reasons are shown in plain words.

## Must NOT build

The loader, row schemas, override rules and protected-machinery list (b31); a mod store, online download or Steam upload (b31 forbids a store; foreign-network work is out of 1.0); scripting or code in packs; a second parser or schema per row type; a favored-effects whitelist; scene art generation (art pipeline owns it); new engine hooks (any new execution capability is its own reviewed interface); the secret scan of the repo and updater (b31 step 5-6); difficulty presets as packs (b25 owns difficulty).

## Research tables

Repo first: `desktop/runtime-content.mjs` (manifest and hash pattern), `desktop/README.md`, `data/content/` (compiled shapes the sample copies), OCD-CONTENT-004 in the register. Missing, one search each, 10 minutes, never invent: Steam Workshop item folder conventions (preview image size, description limits, tags) from Steamworks docs, used only to name folder slots; size limit for one Workshop item. Until found, the packager uses the pack's own 128 KB cap and marks every Workshop-side limit "ESTIMATED FROM AVERAGE: published Workshop items for single-player strategy games".

## Done when (played-game proof)

- Install the sample from the mods folder; new game in a random place via `tests/support/random-place.ts` `drawRandomPlace`: the list shows its additions, the scene, policy question, rule value and balance number appear in play, the overridden built-in is replaced and says so. Same flow in a random territory place and D.C.: one code path, same pack, no per-place branch.
- A deliberately broken copy (bad row, a URL, a `..` path, a fake key) is listed as skipped or refused with plain reasons; the rest of the game plays; turning a pack off removes it at the next new game; a save made with it reloads identically.
- `npm run mod:check` on the sample prints zero problems; `npm run mod:package` makes a folder with matching hashes.
- Tests: `content-pack-report.test.ts`, `content-pack-folder.test.ts` (refuses code, paths, symlinks), `sample-pack-all-sections.test.ts` (every b31 section used, zero skips, 3 random places), `mod-list-switch.test.ts`, `desktop/tests/mods-folder.test.mjs`, `mod-guide-matches-sample.test.ts`, `mod-package-layout.test.ts`, `mod-pack-no-secrets.test.ts`, and a grep test that the old id-only list in `ContentPackWorkspace.tsx` and any duplicate test mod are gone.

## Proof to post

PR comment per step: random place and seed, the mod list screenshot or printed output, the sample pack folder tree, one broken pack's skipped reasons, the packaged folder with hashes, the delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body.

Open owner questions (none blocking): (1) whether packs may be switched on and off mid-game or only at a new game; (2) whether the Workshop folder ever gets a real upload. Switches kept: mid-game switching = one constant `MOD_SWITCH_AT = "new-game"` in the mod list module; Workshop target = `MOD_PACKAGE_TARGET = "folder"`; which sections a pack may override stays b31's `moddableSections`. If b31 has not landed, build steps 2, 6 and 7 against stubs of its row sections and keep step 3's sample as scenes plus traits only, adding sections as b31 lands them.
