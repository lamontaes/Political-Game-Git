# Replaced but still present: repo and Mac inventory (Nov 5, 2026)

Written Thu Nov 5, 2026, about 5:00 p.m. EST. Read only: nothing was committed, moved or deleted.

**What was checked.** Main at `3f98538cb7` (Nov 5, 21:03 UTC). The full file list with sizes came from the GitHub API (17,956 entries, not truncated). References were searched with `git grep` against that exact commit, in the existing checkout `/private/tmp/wt-audit-r`, which sits at that commit and was only read. A search covers every tracked text file: code, tests, scripts, JSON, skills, docs and pool items. Mac sizes come from `du`. A Mac picture counts as a duplicate when its bytes are identical to a file on main (same git blob hash), and as a backdrop source when its SHA-256 equals a `sourceSha256` in `art/backdrops/manifest.json` or `art/campuses/manifest.json`.

**Totals.**

| List | Repo | Mac |
| --- | --- | --- |
| A. Safe to delete now | about 136 MB | about 24.7 GB |
| B. Replaced, still referenced | about 823 MB (old art pipeline 644 MB, old mocks 124 MB, green plates 39 MB, Kit 12 15 MB) | about 2.9 GB |
| C. Unsure | about 120 MB | about 4.6 GB |

Proof screenshots are counted separately in section 3 (about 540 MB).

## What the game actually loads

This is what makes the lists safe.

- `src/bench` (the only game) opens these art folders and no others:
  - `art/backdrops/` (manifest, staging, occluders)
  - `art/people-engine/v4/`: `PEOPLE_PACK = "v4"` in `src/bench/people-pack.ts:11`
  - `art/people-rooms/mannequin-plates/*.mannequins.json` and their two front masks
  - `art/newspaper-mockups/derived/` (`src/bench/handler.ts:462`)
  - `public/ui/kit13`, `public/fonts/kit12`
  - `docs/codex/ui-logo-packet/01_kit12_ui/kit12.css`, for the developer page only
- The desktop build packages only the folders the loader opens (`desktop/scripts/build-play-api.mjs:43`).
- No people pack v1, v2 or v3 is left on main, and no green mannequin library either. `src/bench/people-pack.test.ts:80-87` already fails if `art/people-engine/v1`, `v2`, `v3`, `art/people-whole` or `art/people-rooms/poses` comes back.
- `art/ui-kit13/` is **not** loaded by the game. No code names it, and its README says "Nothing in the game uses them yet". It is in list C.

---

## A. Safe to delete now (replaced, nothing points at it)

### Repo

| Path | Files | MB | Why it's replaced | References |
| --- | --- | --- | --- | --- |
| `docs/screens/2026-10-26-*` (12 folders: filing-menu, menu-names-only, panel-frame, rail, talk-history, toasts, ui-button, ui-card, ui-list-row, ui-panel, ui-tab, ui-talk-box) | 53 | 37.4 | Before and after shots from the Oct 26 UI PRs. The screens have changed since. | none |
| `docs/ui/screenshots/2026-10-14-title/`, `2026-10-14-title-2/` | 8 | 9.3 | The Oct 14 title and new-game screens. The title is now the DC monuments (Oct 29). | none |
| `docs/codex/session14-menu-concepts/` | 32 | 14.8 | Early-October concept pages copying other games' menus. Replaced by the Oct 14 mocks, then by the Nov 5 look. | none |
| `docs/ui/mocks/ui-mock-18.png`, `ui-mock-22.png`, `ui-mock-27.png`, `docs/ui/mocks/README.md` | 4 | 0.65 | The Sept 29 picks. The Oct 14 mocks were built from them. | only that README |
| `docs/reports/screens-2026-10-28/` | 47 | 35.5 | Before and after shots from Oct 28. | only `docs/reports/carcass-2026-10-28.md`, itself a list of files nothing reads |
| `docs/reports/people-v2-2026-10-24/` | 1 | 1.9 | A picture of the v2 people. v2 was deleted Nov 3. | only the carcass report |
| 20 dated folders in `docs/reports/`: birthday-2026-10-25, budgets-2026-10-25, buttons-2026-10-25, calendar-future-day-2026-10-27, calendar-readable-2026-10-14, calendar-today-2026-10-27, circle-changes-2026-10-26, election-night-2026-10-25, filing-in-travel-2026-10-14, job-offer-hold-2026-10-24, job-offer-hold-2026-10-26, legislature-floor-2026-10-27, options-simple-2026-10-14, panels-2026-10-25, plain-text-2026-10-25, play-time-controls-2026-10-15, politics-guide-2026-10-25, rooms-2026-10-25, title-lincoln-2026-10-25, words-batch-22-merger-2026-10-24 | 30 | 19.1 | Screens from Oct 14 to 27 that have since changed. | only the carcass report |
| 4 dated folders in `docs/reports/`: filing-overlay-2026-10-24, news-front-page-2026-10-14, news-story-paper-2026-10-27, politics-hub-2026-10-14 | 19 | 12.8 | Same kind of screenshots. | none |
| `public/ui/kit12/scales-level.svg`, `scales-tipped.svg` | 2 | 0.0 | Kit 12 icons that no page uses. | none. Optional tidy: `src/bench/server.ts:27` still lets `ui/kit12/*.svg` be served (`kit1[23]`). |
| `art/newspaper-mockups/masthead-daily-2.png`, `front-page-daily-2.png`, `story-president-1.png`, `all-newspaper-mockups.jpg` | 4 | 4.7 | Its README says "Not used in play": dark plates that won't take ink, and a face that would stand for the generated president. | only `art/newspaper-mockups/README.md` (lines 3, 7, 8, 12, 29; edit them) and the generated `art/qa/inventory_report.json` |

### Mac (`/Users/lamontae/political-game-play`)

| Path | Size | What it is | Checks |
| --- | --- | --- | --- |
| `scratchpad/Political-Game-Git/` | 7.8 GB | Full clone at the Oct 19 main (#5016). Still holds the old v1 and v2 people. | Clean. One local commit is not on GitHub: `fd6363eab9` "pool: priority edits per audit Oct 19" on branch `pool-claim-world-census-weight-economy`. It only edits the priority line of 13 pool items, long superseded by the pool audit. No skill or memory names this folder. |
| `scratchpad/copilot-worktrees/Political-Game-Git/` (copilot-prewarm-stunning-fiesta, lamontaes-laughing-engine) | 6.3 GB | Two worktrees of the clone above, Oct 19. | Clean. Their commit `476a42b817` is on GitHub. Delete them together with the clone. |
| `scratchpad/wt-merge/` | 3.3 GB | Worktree of `~/Documents/PG-LAND`, main at Oct 26. | Clean, no unpushed commits. Remove with `git -C ~/Documents/PG-LAND worktree remove <path>`, so PG-LAND's worktree list stays right. |
| `scratchpad/wt-merge-b/` | 3.4 GB | Same, on `claude/words-bench-stage`, Oct 16. | Same. |
| `scratchpad/wt-outfits/` | 2.8 GB | Same, on `cto/poses-oct7`, the Oct 7 people-pack outfits. | Same. |
| `scratchpad/shots`, `shots-base`, `shots-final`, `shots-final2`, `shots-final3`, plus loose Oct 6 to 7 files (`POOL-now.md`, `POOL.md`, `body-*.md`, logs, `z11.png`, `z13.png`) | about 0.13 GB | Title-screen shots and runs from Oct 7. | Nothing names them. |
| `cto-notes/newspaper-mockups/` | 17 MB | 11 of 13 are byte-identical to `art/newspaper-mockups` on main. The other two, `story-governor-2.png` and `story-president-2.png`, were held back because their faces resemble real politicians (repo README line 11). | |
| Old screen mocks: `cto-notes/ui-mock-html` (107 MB, Sept 29 to Oct 5), `screens-1007` (154 MB, Oct 7), `ui-screens-2026-10-13` (106 MB), `firefly/ui-mocks` (26 MB, Sept 29), `firefly/mockups` (6.6 MB, Oct 7) | about 400 MB | All older than the Oct 14 mocks. | No skill names them; only old memory notes do. |
| Old screenshots: `cto-notes/owner-shots` (30 MB, Oct 6), `monday-shots` (1.9 MB, Oct 12), `preview` (6.1 MB, Oct 1) | 38 MB | Screens of builds that are gone. | |
| Old people: `cto-notes/people-masters` (8.8 MB, Sept 27), `people-test` (7.3 MB, Oct 12); `firefly/outfits` (153 MB), `expressions` (63), `three-quarter` (55), `faces` (6.6), `hair` (1.5), `hair-raw` (1.6), `accessories-raw` (12), `proof` (9.9), `canva` (28, hair batches), all Sept 27 to 30 | about 350 MB | v1 and v2-era parts. The owner said on Nov 3: "Delete all the V1, V2, and V3 people". | 0 files identical to anything on main. No skill names these folders. |
| `cto-notes/scenario/casual`, `formal`, `kit`, `looks`, `out`, `intro`, `scenes`, `build-poses2` | about 275 MB | Oct 28 people work from the v3 era, replaced by pack v4. | 0 identical on main, except 3 backdrops in `intro`. No skill names them. |

---

## B. Replaced but still referenced (exactly what points at it)

### B1. The old art pipeline: people candidates, the Art Desk rooms and their code (821 files, 644 MB)

This is one connected set. Every reference from code, a test, a script or a JSON file to any old people folder sits **inside** this set. So it can only go out in one PR, with the outside edits listed below.

The game reads none of it:

- Nothing under `src/bench` opens these folders.
- `ARCHITECTURE.md:91` says `src/appearance/` is read only by "the art scripts and their tests".
- `scripts/dev-lab/compiled-art-usage.ts:13-16` says the screens that bound this art "were removed with the old engine (#4036)" and that the game "binds no configured art yet".

Evidence it is replaced:

- `docs/coordination/DECISION-REGISTER.md:432` (owner, Sept 21, AUDIT-RETURN-2 #9): "unused, rejected and replaced project assets/code/instructions are deleted… The current Visual4 derivatives and unused Wave-A material are within scope; the65hair masters need an exact current-use check".
  - That current-use check is done here: the hair masters in `people-visual4-hair` are read only by `art/manifest/people_visual4_hair_attachments.json`, `people_visual4_head_targets.json` and generated QA reports, all inside this set.
- `docs/archive/95-wave-a-morphology-and-recent-drive-ingestion.md:18`: the Wave-A sheets "remain morphology evidence only".
- `docs/coordination/people.md:61`: "Delete … the appearance-engine code, dress code and their tests, once nothing reachable from `/play` uses them".
- The people-pack skill: people come only from `art/people-engine/v4`, and a new version replaces the old folder.

**The set:**

- `art/generated/` (337 files, 215.6 MB)
- `art/references/` (151 files, 318.2 MB)
- `art/qa/` (76 files, 26.0 MB)
- `art/manifest/` (21 files, 1.4 MB)
- `art/requests/` (46 files), `art/intake/` (8), `art/fixtures/` (16), `art/pose-control-plates/` (7)
- `art/families/` (37 files, 80.7 MB): the September Art Desk rooms. The game draws rooms only from `art/backdrops`.
- `art/regions/` (2), plus near-empty `art/approvals`, `coverage`, `events`, `hero`, `shared`, `style`
- `scripts/art-asset-factory/` (73 files), except the two backdrop importers kept below
- `src/appearance/` (6 files), `src/authoring/` (6 files)
- `scripts/dev-lab/compiled-art-usage.ts`, `scripts/dev-lab/runtime-art-build.ts`
- 14 tests: `tests/arm-measure`, `art-asset-factory`, `asset-bank-inventory`, `cargo-disposition`, `character-components-validation`, `edge-despill`, `garment-fit-measure`, `garment-fit-row-correspondence`, `garment-fit`, `habs-ingestion`, `master-inventory`, `runtime-asset-budget`, `wave-a-candidate-admission`, `wave-a-wardrobe` (all `.test.ts`), and `tests/fixtures/art-asset-factory/`

**Found inside it:** `art/references/masters/scene-environment/PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02_5504x3072.png` (18.3 MB). This is the community-meeting title painting the owner ordered deleted on Oct 2 (`docs/archive/codex/handoff/followups-2026-10-02.md:50`). It is still on main. Only this set's JSON and some archive docs name it.

**Old people folders, one row each.** The code column only lists files inside this set; no code outside it names any of these folders.

| Folder | Files | MB | Code, test or script that names it (inside the set) | JSON naming it (all inside the set) | Docs / pool |
| --- | --- | --- | --- | --- | --- |
| `art/generated/approved/pg-modular` | 35 | 3.11 | factory/pg-modular-intake.ts | 9 | 1/0 |
| `art/generated/approved/dev-modular` | 16 | 0.06 | factory/dev-character-fixtures.ts | 9 | 1/0 |
| `art/generated/approved/dev-modular-g2` | 30 | 0.15 | factory/dev-character-fixtures-g2.ts, tests/character-components-validation.test.ts | 21 | 0/0 |
| `art/generated/approved/human_candidate_A01…`, `B01…` | 2 | 0.76 | tests/art-asset-factory.test.ts | 8 | 0/0 |
| `art/generated/candidates/ocd-p71` | 32 | 33.91 | factory/cli-edge-despill.ts, factory/cli-measure-references.ts | 22 | 1/0 |
| `art/generated/candidates/ocd-p76` | 8 | 10.10 | factory/cli-edge-despill.ts, factory/cli-measure-references.ts | 10 | 4/0 |
| `art/generated/candidates/oct6-firefly` | 4 | 5.67 | none | 1 | 1/0 |
| `art/generated/candidates/people-coherence` | 6 | 1.31 | none | 6 | 0/0 |
| `art/generated/candidates/people-visual4-masked` | 1 | 0.91 | none | 3 | 0/0 |
| `art/generated/candidates/recent-drive-sweep` | 76 | 88.63 | factory/wave-a-candidate-admission.ts | 23 | 2/0 |
| `art/generated/candidates/wave-a-morphology` | 35 | 50.20 | factory/wave-a-candidate-admission.ts | 18 | 1/0 |
| `art/generated/candidates/wave-a-runtime` | 18 | 15.95 | factory/wave-a-wardrobe.ts | 5 | 0/0 |
| `art/generated/candidates/wave-a-wardrobe` | 71 | 4.82 | factory/wave-a-wardrobe.ts | 4 | 0/0 |
| `art/references/candidates/people-visual4-hair` | 73 | 48.42 | none | 5 | 2/0 |
| `art/references/candidates/recent-drive-sweep` | 15 | 129.50 | none | 27 | 2/0 |
| `art/references/candidates/wave-a-morphology` | 5 | 55.09 | none | 11 | 1/0 |
| `art/references/masters/pg-modular` | 30 | 9.94 | factory/pg-modular-intake.ts | 10 | 4/0 |
| `art/references/masters/body-head` | 1 | 11.29 | none | 10 | 0/0 |
| `art/references/masters/people-pose` | 1 | 12.11 | none | 11 | 0/0 |
| `art/references/masters/wardrobe` | 1 | 11.00 | none | 10 | 0/0 |
| `art/references/masters/scene-environment` (rooms and the banned title painting) | 9 | 39.19 | factory/cli-measure-references.ts | 9 | 3/0 |
| `art/references/approved/packet76` | 2 | 0.96 | tests/art-asset-factory.test.ts | 5 | 2/0 |
| `art/references/plans` (Texas Senate floor plan) | 11 | 0.68 | factory/cli-intake.ts | 4 | 1/0 |
| `art/fixtures/` | 16 | 0.07 | 4 factory scripts, 3 tests | 0 | 3/0 |
| `art/pose-control-plates` | 7 | 0.05 | tests/character-components-validation.test.ts | 5 | 0/0 |
| `art/qa/` | 76 | 25.98 | 9 factory scripts, src/appearance/garment-fit.ts, 6 tests | 7 | 18/0 |
| `art/manifest/` | 21 | 1.44 | 15 factory scripts, src/appearance (2 files), compiled-art-usage.ts, runtime-art-build.ts, 6 tests | 37 | 32/1 |

`art/qa/` is also named outside the set, by the people-pack skill (below).

**Files outside the set that must change in the same PR, or the build and tests break:**

- **`package.json`, 24 lines (lines 31 to 48, 73, 74, 81 to 84):**
  - 22 scripts: `intake:texas-senate`, `validate:art`, `inventory:art`, `inventory:masters`, `qa:art`, `chop:source-sheet`, `admit:wave-a-candidates`, `derive:wave-a-wardrobe`, `derive:scene-tiers`, `derive:office-plate`, `extract:chroma`, `fixtures:dev-characters`, `fixtures:dev-characters-g2`, `fixtures:garment-fit`, `derive:garment-fit`, `measure:arms`, `intake:pg-modular`, `despill:edges`, `measure:references`, `kit:art`, `test:modular:public`, `test:modular:private`.
  - Plus `validate` and `validate:ci-sharded`, which call `validate:art`, `admit:wave-a-candidates -- --check` and `derive:wave-a-wardrobe -- --check`.
  - CI (`.github/workflows/validate.yml`) runs none of these.
- **`scripts/stamp-client-provenance.mjs:39`** runs `scripts/dev-lab/compiled-art-usage.ts` in every `npm run build`.
  - That script imports `art/manifest/asset_manifest.json` and reads the `art/manifest/` folder, so **the build fails** unless this call is removed too.
  - It only writes an empty `art-usage.json` and `runtime-art-consumers.json`. Nothing reads either file.
- **`vite.config.ts:1`**, plus its plugin list: `runtimeArtBuild` from `scripts/dev-lab/runtime-art-build.ts`.
  - It scans `art/manifest/`, but only does anything when a file imports `bundled-art`, and none does.
- **Config files:** `tsconfig.node.json:28,36,96` (`src/authoring`, `src/appearance`); `eslint.config.js:22,57`; `.prettierignore` (2 lines naming `art/manifest/…`); `.gitignore:25` (`art/generated/candidates/art-desk/`).
- **`tests/guards/english/spelling-dates-units.test.ts:132,210`** uses `art/requests/asset-requests.json` as a sample file. Pick another file.
- **Small mentions to drop:**
  - `scripts/english-check/wording.ts:148` (`"src/authoring/"`)
  - `scripts/research/placeholder-scan.ts:54` (`src/authoring/fixtures/`)
  - `scripts/agent-test-cadence.mjs:37` (regex)
  - `data/runtime-text/baseline.json` (5 rows for `src/authoring/...`)
  - `src/core2/appearance.ts:42` (comment)
  - `desktop/README.md` (mentions `art/references`)
  - `desktop/tests/runtime-content.test.mjs:44` uses the name as fixture text only, so it passes either way.
- **Skills (both copies, `.agents` and `.claude`):**
  - `asset-scene-admission/SKILL.md` must be rewritten. Line 23 says "Reuse `scripts/art-asset-factory/`". Lines 30 and 38 run `derive:scene-tiers`, `validate:art`, `inventory:art` and `qa:art`. It also sends readers to `docs/systems/art-assets.md` and the scene docs.
  - `people-pack/SKILL.md:31` says to regenerate `art/qa/inventory_report.json` with `npm run inventory:art`.
  - `.agents/rules/repository-reference.md:28` lists the art npm commands.
- **Docs that describe the pipeline as current:**
  - `ARCHITECTURE.md:91-93`
  - 9 docs: `docs/systems/art-assets.md`, `arm-and-sleeve-measurement.md`, `art-request-intake.md`, `garment-morphology-fit.md`, `kit41-appearance-asset-kit.md`, `pose-families.md`, `runtime-asset-budget.md`, `scene-and-person-presentation.md`, `scene-authoring-pipeline.md`
  - Pool items: `core-delete-old-engine`, `core-old-engine-07-appearance-and-delete`, `director-stopgap-scene-placeholder-art`, `people-seat-slots-gone`, `release-green-suite`, `release-repo-sweep-unread-files`
  - About 96 dated plans and reports, and 70 archive or codex history files, mention the paths in passing (Appendix).
- **Keep and move out of `scripts/art-asset-factory/`:** `import-capitol-backdrops.mjs` and `import-place-backdrops.mjs`.
  - They write `art/backdrops/manifest.json` and import nothing from the set.
  - The Mac firefly-art skill runs `import-capitol-backdrops.mjs` (`~/.claude/skills/firefly-art/SKILL.md:126`); update that path.
- **Guard:** add the deleted folders to the "leaves no … file" list in `src/bench/people-pack.test.ts:80-87`. The people-pack skill's rule asks for this.

### B2. 17 Oct 14 person crops are still on main, although PR #7301 says they were removed

- **Files:** `docs/ui/mocks/screens-2026-10-14/page/img/bust-look-003, 004, 006, 007, 008, 010, 013, 017, 020, 024, 025, 027, 028, 029, 034, 035, 036.png` (1.3 MB).
- **What happened:** #7301 merged at 20:55 UTC and its body says it deleted "all seventeen head-and-shoulders crops". Its 10 changed files delete only the four `fig-look-*.png` and edit 6 lines.
- **Confirmed:** the GitHub contents API at main still lists 17 `bust-look` files.
- **Still pointing at them:** `page/index.html`, all 19 `page/shot/*.html` pages, `source/head.py` (1 line) and `source/screens2.py` (6 lines).

### B3. The green mannequin plates (Oct 27), replaced by blobs on Nov 3

- **What:** `art/people-rooms/plates/*.png`, 26 files, 38.6 MB.
  - Their README says they are "Never drawn in the game. It exists only to be measured."
  - The owner, Nov 3: "Delete that mannequin."
  - `art/people-rooms/mannequin-plates/README.md` already says "the green mannequin pictures are deleted; seats are blobs".
  - PR #7138 removed only three other green pictures.
- **No code opens them:** `scripts/people/room-spots.ts` reads only `spots/*.json`.
- **Named by:**
  - `art/backdrops/staging.json`: 26 `measuredFrom` text strings.
  - `art/people-rooms/spots/*.json`: 26 files, through a `plate` field.
  - `art/people-rooms/manifest.json`, `MANIFEST.md`, `README.md`, `art/qa/inventory_report.json`.
  - The room-spots skill (both copies), lines 8, 29 and 31, still tells you to paint green mannequins, so the skill needs the blob method.
- **Same Oct 27 setup, also replaced:**
  - `art/people-rooms/tools/`: 9 files, including `v2cut.py` and `wardrobe_parts.py` for the deleted v2.
  - `tags/` (26 files), `prompts/` (2 files), `manifest.json`, `MANIFEST.md`.
  - Named by `scripts/people/room-spots.ts:293` (a text it writes), `staging.json` and `docs/art/HANDOFF.md`.
- **Keep** `art/people-rooms/spots/*.json`: room-spots.ts reads them.

### B4. Radial-menu and Oct 5 mocks (124 MB)

- **What:** `docs/codex/session14-mockups/` (216 files, 98.0 MB: radial-menu candidates) and `docs/mockups/oct5-menus/` (22 files, 26.0 MB).
- **Why replaced:** LAW.md:16 says "No radial menu". The oct5-menus README opens with "Superseded".
- **Named by:**
  - `eslint.config.js:31-32` (ignore patterns)
  - `docs/reports/repo-audit-2026-10-19.md`
  - `docs/archive/codex/assignments/b42-…md`
  - pool item `release-repo-archive-docs` (status dropped)
  - the session14 READMEs, which go with the folder

### B5. Kit 12 UI, replaced by Kit 13

- **What:** `docs/codex/ui-logo-packet/01_kit12_ui/`, 19 files, 14.9 MB.
- **Why replaced:** `OWNER-DECISIONS.md:835`: "The play page is on Kit 13".
- **Still read:** `src/bench/dev-api.ts:33` still serves its `kit12.css` to the developer page, `src/bench/dev.html:7,9`. The developer page must move to Kit 13 first.
- **Also named by:** `docs/README.md:42`, `docs/coordination/OWNER-DECISIONS.md`, `play.md` and `prior-rulings/screens.md`.
- **Keep:** the fonts in `public/fonts/kit12` are live.

### B (Mac)

- **`cto-notes/firefly/poses/` (2.5 GB, 4,734 pictures, Sept 28 to Oct 7).**
  - The v1 and v2 pose sheets. None of them is on main.
  - The firefly-art skill (lines 116, 123, 134) names the scripts inside it: `cut_poses.py`, `queue-builder.js`, `qa_solo.py`. Move the scripts first.
- **`cto-notes/scenario/build-rally/` (421 MB, Oct 28 to 29).**
  - 915 of its 1,308 pictures are byte-identical to pack v4 on main, so the repo already holds them.
  - Its scripts are named by the people-art-checks skill (lines 12, 14, 43: `engine.py`, `export_kit.py`, `kit_check.py`, `kit_layers_check.py`, `sheet.py`) and the firefly-art skill (line 159: `build-rally/README.md`).

---

## C. Unsure (and why)

### Repo

| Path | Files | MB | Why unsure |
| --- | --- | --- | --- |
| `docs/ui/mocks/screens-2026-10-14/` (everything except the bust crops) | 70 | 21.7 | See the note below this table. |
| `docs/mocks/2026-11-04/campaign-board.html`, `.png` | 2 | 0.4 | Lane 4's Unit 8 proof (`docs/lanes/state/lane-4.md:53,117-120`), not built in the game yet. It is older than the Nov 5 look. |
| `art/ui-kit13/` | 51 | 10.5 | Never loaded: its README says "Nothing in the game uses them yet", and the Oct 27 log says the mastheads are "referenced by no code". The news mastheads were replaced by `art/newspaper-mockups/derived` (Oct 28). The 4 calendar icons were copied into `public/ui/kit13`, which is live. Its brass corners and gold rules clash with the Nov 5 "no boxes, no thin gold rules" look. Only docs name it: 3 finished pool items, playtest drafts, `docs/release/consumed-changes.json`, the mocks README. Probably list A, once he confirms. |
| `art/campuses/` | 261 | 74.1 | Not loaded since Oct 28: its only reader, `src/presentation/campus-backdrops.ts` (`docs/coordination/locations.md:37`), went with the old engine. The game now uses `college-quad` and `university-lecture-hall`. It may have been replaced, or it may be waiting to be wired back in; that's his call. Named by `data/credits/credits.json` (`"usedIn": ["art/campuses"]` rows), `docs/coordination/locations.md`, `play.md`, `fixer.md`, `art/incoming/firefly/index.json`. |
| `art/newspaper-mockups/` 7 originals | 7 | 9.5 | The sources the in-game crops in `derived/` were cut from (README table). They are not replaced; they are needed only to re-cut. Under "keep only results", they could go. |
| `art/people-rooms/mannequin-plates/oval-office-standard__midday.png`, `oval-address-standard__night.png` | 2 | 2.8 | Byte-for-byte the PNG sources (`sourceSha256`) of two in-game backdrop JPGs. Every other backdrop keeps only its JPG. Named by `art/backdrops/manifest.json` (`sourceFile`), the v4 and mannequin-plates READMEs, and pool item `people-pack-v4`. |
| `art/incoming/firefly/` | 4 | 1.2 | Three White House exterior lights (morning, night, rain), not imported since Oct 13; `art/backdrops` has midday only. Its index says "Delete a file in the PR that imports it." |
| `scripts/art-asset-factory/cli-inventory.ts`, `inventory.ts`, `content-hash.ts` | 3 | 0.0 | General tools that hash every art file into `art/qa/inventory_report.json`; the people-pack skill uses them. Keep them (moved), or drop them along with that skill line. |
| Rest of `docs/codex/ui-logo-packet/` (logo, key art, other marketing art) | 19 | 24.2 | `02_logo/emblem-final.png` is the recorded source of `public/branding/emblem-final.png` (`public/branding/lineage.json:2`). The rest is his. |

Note on the Oct 14 mocks (first row):

- The Nov 5 look (menu-look skill) replaces their look, and Government has a newer mock on the Mac (`cto-notes/menus/government-v*`).
- The other 18 screens have no newer mock in the repo yet.
- They are still cited as the standard:
  - `docs/play-first/LAW.md:7`, which defines MOCKS, plus 9 `MOCKS:NN` citations
  - the screen-to-mock skill, line 10 (both copies)
  - `DECISION-REGISTER.md:151`, `BOARD.md:9`, `docs/README.md:19`, `OWNER-DECISIONS.md:217`
  - comments in `src/bench/government-bodies.ts:3`, `play.css:3496`, `play.mjs:3805`
  - 30 pool items
- `LAW.md:15` still describes Issues cards with "a marker between the two extremes", which the Nov 5 no-sliders ruling replaced.
- Suggestion: delete screen by screen as each new mock lands, and rewrite each citation to quote the ruling instead.

### Mac

- **`cto-notes/scenario/standard/` (3.4 GB).** People art is paused until he picks a path, so what counts as replaced isn't settled. It holds both of the master sets he picked on Nov 3:
  - `standard/v4/` (45 MB): the V4 sheets.
  - `codex-test/fit/lego/final/` (17 MB): the bald, blank masters.
  - Experiments he rejected:
    - `blender/` (1.9 GB): "3D isn't it", Nov 4.
    - the rest of `codex-test/` (about 1.2 GB): the Codex paint look, rejected Nov 3.
    - `layers` (131 MB), `modeltests` (45 MB), `plates` (34 MB), `wardrobe` (7.5 MB).
  - The people-engine, people-blender, codex-images, people-art-checks and firefly-art skills all name tools in here.
- **`cto-notes/firefly/capitols` (653 MB), `places` (107 MB), `universities` (100 MB), `noon` (159 MB), `oct6` (147 MB).** Mixed. Some files are the recorded source PNGs of in-game backdrops or campuses (175 of 437, 69 of 74, 52 of 364, 15 of 311, 67 of 187). The rest are takes that were never used, and in `noon`, old base people. `universities/fetch_landmarks.py` is named by the firefly-art skill (line 138).
- **`~/.Trash/people-delete-2026-11-03` (232 MB).** Outside the project folder. The Nov 3 delete is still waiting for him to empty the Trash; I can't empty it.

---

## 3. Proof screenshot folders (totals only)

| Folder | Files | MB | What names it |
| --- | --- | --- | --- |
| `docs/play-first/shots/` (87 item folders) | 479 | 392.8 | `src/bench/filing.browser.mjs:133,139` and `politics.browser.mjs:92,131,162` (they write screenshots here). The people-pack, play-first, screen-to-mock and words-engine skills (both copies) make "screenshots go under `docs/play-first/shots/<item>/`" the rule. Also 2 docs and 20 pool items. |
| `docs/play-first/shots-27/` | 41 | 36.3 | 2 pool items |
| `docs/play-first/shots-28/` | 7 | 9.9 | nothing |
| `docs/play-first/screens/` | 66 | 52.1 | 1 doc, 2 pool items |
| `docs/lanes/proof/` (18 folders) | 263 | 50.3 | `docs/lanes/state/lane-1.md` to `lane-5.md`, 3 pool items |
| 9 dated `docs/reports/` folders written by browser checks (advanced-start, ballot-pages, campaign-controls, card, donors, money-layout, race-line, towns, travel-cards) | 36 | 32.5 | one `src/bench/*.browser.mjs` each; money-layout also in 2 pool items |
| `docs/reports/four-screens-2026-10-27/`, `people-web-2026-10-14/` | 8 | 5.0 | `four-screens.browser.mjs:11`, `people.browser.mjs:114`; the play-first skill |
| `docs/reports/job-offer-hold-2026-10-25/`, `person-card-layout/`, `rooms-2026-10-26/` | 3 | 3.3 | pool items, `docs/release/consumed-changes.json` |

The browser checks only **write** to these folders. Deleting the committed pictures breaks no code; the next run writes them again.

Not counted as replaceable: `docs/reports/playtest-2026-10-24/` (108 files, 46.9 MB). It is the owner's Oct 24 playtest record, named by `OWNER-DECISIONS.md`, `scripts/scene-web/owner-examples.json` and 62 pool items.

---

## Appendix: other files that mention the old art pipeline's paths

These are history, not instructions. Delete them or leave them as dated records. The owner's rule ("every reference") argues for editing out the paths.

**Dated docs (96):**

.gitignore, data/runtime-text/baseline.json, docs/ACCEPTANCE-TESTS.md, docs/LOCAL-REGISTRAR.md, docs/agent/evidence/modular-gen14/APPEARANCE-RECIPE-V2.md, docs/art/session11-source-handoff.md, docs/art/session11-source-request.json, docs/audits/2026-09-30/dice.md, docs/coordination/LEADS-2026-10-24.md, docs/coordination/playtest/2026-10-27-1-helper.md, docs/decisions/DECISION-LOG.md, docs/design/core2-porting-plan/audit/screens.md, docs/design/core2-porting-plan/files.csv, docs/design/old-core-retirement-map.md, docs/findings/2026-09-22-planning-words-in-runtime-data.md, docs/integration/d33-foundation-to-a.md, docs/integration/g41-scene-contract.json, docs/integration/incident-response7-validation.md, docs/integration/people41-standing-handoff.md, docs/integration/playable29-b-material.md, docs/integration/rest37-f-finite-receipt.md, docs/integration/s37-s-finite-current-member.md, docs/lanes/lane-4.md, docs/legal/legal-check-2026-10-12.md, docs/plans/active/92g-judicial-gameplay-current-mechanics-wave.md, docs/plans/active/env-all1-progress.md, docs/plans/active/morning23-b-handoff.md, docs/plans/active/next24-b.md, docs/plans/active/p2r2-owner-review.md, docs/plans/active/people-coherence-b.md, docs/plans/active/people1-candidate-admission-and-review.md, docs/plans/active/playtest65-u.md, docs/plans/active/pose41.md, docs/plans/active/runtime-asset-budget.md, docs/plans/active/source-substrate-convergence.md, docs/plans/active/stage-6-5-pr13-visual-convergence.md, docs/plans/active/systemic-modular-repair.md, docs/plans/completed/ (41 files: 101l, 120l, 128r1, UX39-calendar, acs-pums-household-donor-bridge, c119b, cx-prose1, delivery28-d, final-landing-q4-124, fiscal-activate1, fiscal-evidence6, generated-person-correctness-followup, incident-response7, jurisdiction-portability-fixture, kit41, modular-character-foundation, modular-character-runtime-proof, morning23-d, morning23-e, news-help2, people-visual4, people40-room-fit, playtest34-life, pr102, pr103-ci-budget, pr103-two-blocker-repair, pr111, pr113, pr79, pr85b, pr89, real-modular-character-integration, recovery25-prose, scene-reference-venue-topology, stage-6-5-run-b ×2, stage-6-5-run-c, thin-election-contest-substrate, v89b, version-auto1-r1, vimg-jpeg1), docs/plans/p31-ops-play-first.md, docs/playtest/what-campaign-sessions-are-missing-2026-09-22.md, docs/release/DORMANT-PULL-REQUESTS-2026-09-22.md, docs/release/MERGE-TRAIN-2026-09-22.md, docs/release/consumed-changes.json, docs/reports/2026-10-legal-review.md, docs/reports/carcass-2026-10-28.md, docs/reports/dead-code-2026-10-14-keeps.txt, docs/reports/old-engine-removal.md, docs/reports/owner-record/02-cto.md, docs/reports/owner-record/05-overnight.md, docs/reports/repo-audit-2026-10-19.md, docs/research/ (6 files: chatgpt-answers/2026-09-22-nationwide-2235/OCD-REGIONAL-SCENES…, requests/apparent-turn-versus-silhouette-turn.json, planning-words-that-became-product-rules.json, regional-scene-place-ids.json, seated-figure-reads-as-in-the-seat.json, temperament-marks-on-a-person-card.json).

**Archive and codex history (70):** files under `docs/archive/` (60A, 60B, 60D, 72A, 74, 76a, 76b, 77A, 92b, 95, BROWSER-SUITE-*, README*, codex/assignments, codex/handbacks, codex/handoff) and `docs/codex/` (08-art-into-the-game.md, claims.md, main-health.md, specs/bank/b24, effect-batches logs). The full list comes from the same search: run `git grep -l` with the terms `art/generated`, `art/references`, `art/qa`, `art/manifest`, `art-asset-factory`, `src/appearance` and `src/authoring`, restricted to `docs/archive` and `docs/codex`.
