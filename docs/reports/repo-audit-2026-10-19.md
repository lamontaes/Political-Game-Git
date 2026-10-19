# Repository audit, Oct 19 2026

Claude CTO's repository auditor. Read-only, from `main` at `0104686` (tree of 17,154 files, **3.13 GB**, no Git LFS). Method: the full recursive tree, every code file outside `art/`, `docs/`, `data/` and `public/` read through the API (2,330 files), an import graph built from them, and code search. Nothing was run. Rulings applied: "Slim the repository like a real game before early access … the guards stay" and today's "the old core was supposed to have been removed … there's no reason to keep all this stuff around."

| Top folder | Files | Size |
| --- | ---: | ---: |
| `art/` | 7,958 | 1,386 MB |
| `data/` | 1,535 | 1,071 MB |
| `docs/` | 4,295 | 402 MB |
| `public/` | 379 | 141 MB |
| `src/` | 2,149 | 117 MB |
| `scripts/` | 472 | 4.2 MB |
| everything else (17 roots) | 366 | 7 MB |

## A. The old core, exactly

`src/simulation/` is **924 files, 27.1 MB** (27,119,899 bytes): 894 hand-written `.ts` files (about 390,000 lines), 27 generated files (13.3 MB, half the bytes), 19 tests, 5 JSON. Largest parts: 484 loose files at its root (14.4 MB), `crisis/` 6.1 MB, `living-world/` 1.6 MB, `governing/` 1.1 MB. Its sibling `src/presentation/` (old appearance engine) is 15 files, 0.3 MB.

**It is not a leaf.** `simulation/world.ts` and `simulation/types.ts` import the rest, so any one import drags in almost all of it: production files in `src/` (not tests, not tooling) reach **857 of 924** old files; counting tests and scripts, **904 of 924**. Deleting it is therefore all-or-nothing per importer, not file by file.

### Every importer outside the folder (61 import edges, 35 files)

| Importer | What it takes | Job |
| --- | --- | --- |
| `src/core2/population.ts` | `createWorld`, `assertWorldIntegrity`, `writeWithWorldIntegrityOnce` (a scratch old World, "never advanced or returned"), old household/kinship/partner types, `createCharacterHistoryContextPeople`, `ensureTownEmployment`, `organizationProfileAt`, `PERSONALITY_PACK`, `upbringingFor`, trait registry and packs | opening town builder |
| `src/core2/town-households.ts` | `birthCohortGivenName`, `DEFAULT_CORPUS_VERSION`, `drawCanonicalNamedIdentity`, `generatePersonIdentity`, `nameCorpusVersionForWorld`, old `PersonIdentity`/`World` types | opening town builder (names) |
| `src/core2/opening-employment.ts` | `TOWN_WORKPLACES`, `townEmploymentMix`, `activeWorkers`, `laborStatus`, tenure/part-time tables, `TOWN_EMPLOYMENT_META`, `organizationProfileAt`, `jailTermOn`, old types | opening town builder (jobs) |
| `src/core2/opening-work.ts` | `WORK_PATTERNS`, `workSchedulesFor`, old types | opening town builder (schedules) |
| `src/bench/world.ts`, `src/core2/tooling/generated-world.ts` | `releaseRecentHistory`, `forgetLastValidatedWorld` (old-world memory caches) | goes away with the scratch World |
| `src/bench/card.ts` | `people-trait-definitions` | traits (PR #5110 open) |
| `src/bench/creator.ts` | `names-data` | names |
| `src/core2/tooling/build-place-lookup-data.ts` | `legislation-scenarios`, `demo-jurisdiction-context`, `legislature-rule-packs`, `legislative-work-key`, `seats-of-government.generated`, `state-reference` | data builder (PR #5032 open) |
| `src/core2/tooling/build-opening-schools.ts` | one type | data builder |
| `src/education/tuition-prices.ts` | 11 old modules | **dead**: only old-core files import it |
| `src/presentation/character-components.ts` | `person-appearance` | art pipeline |
| `data/tables/index.ts` | 6 generated tables (type-only) | data export |
| `tests/fixtures/synthetic-cohort.ts` → `tests/mortality-calibration.test.ts` | `conditionOnsetDay` (`crisis/condition-pack`), `STRAIN_THRESHOLD` (`crisis/mortality`) | **health condition pack** |
| `scripts/dev-lab/expected-deaths.ts` | `deserializeWorld`, `mortalityCalibrationOf` | health (old saves; dead) |
| 9 more scripts | `scripts/source/{export-data-tables, export-town-council-profile-inputs, executive-authority-r3h-reconciliation, school-name-patterns}`, `scripts/source/regional-money/export-office-pay`, `scripts/world/compile-area-residents`, `scripts/english-corpus/grading-batch-speech`, `scripts/prose-corpus/sources/episodes` (four of these **write into** `src/simulation/`) | exporters |
| 10 tests | `src/core2/{gov-rules, gov-rules/given-name-cohorts, population, business-books}.test.ts`, `src/districts/members-per-district.test.ts`, `tests/{data-tables, seat-of-government-places, starting-law-term-completeness, source/official-office-pay}.test.ts`, 2 tests under `scripts/source/` | old-vs-new parity checks and old data |

Config still names it: `eslint.config.js` (3 rules), `tsconfig.node.json` (include), `tests/simulation-loads-under-tsx.test.ts`.

### The two remaining jobs, confirmed, and the smallest lift

**1. Opening town builder.** Confirmed: `buildPopulation()` in `src/core2/population.ts` (1,644 lines) builds a throwaway old-engine World, writes people, households and town jobs into it with old-engine code, then copies them into a core2 `CoreInput`. Core2 already does most of the surrounding work itself (`opening-kin`, `opening-partnership`, `opening-personality`, `opening-income`, `opening-staffing`, `household-mix`, `person-names`, `trait-source`, `condition-pack`; 60+ `opening-*` files). What still lives only in the old core:

| Piece | Old file | Lift into | In flight |
| --- | --- | --- | --- |
| Work patterns and schedules | `living-world/work-schedules.ts` (714 lines) | `src/core2/opening-work.ts` | #5084, #5097 |
| Town workplaces, employment mix, labor status, tenure | `living-world/town-employment.ts` (+ `.generated`, 1,718 lines) | `src/core2/opening-employment.ts` | #5093, #5100 |
| `organizationProfileAt`, `jailTermOn` | `life-queries.ts` (1,206), `justice/jail-terms.ts` | read core2's own organization and justice records | #5073 |
| Traits, personality, upbringing | `trait-packs`, `trait-registry`, `people-traits`, `personality-catalogue`, `people-upbringing`, `people-trait-definitions` | `src/core2/trait-source.ts`, `opening-personality.ts` | #5104 → #5108 → #5110 |
| Names and identity | `given-name-cohorts`, `place-name-corpus`, `names-data`, `people`, `person-identity` | `src/core2/person-names.ts` | #5031 |
| Character history | `character-history.ts` | `src/core2/town-households.ts` | none (pool item `people-port-character-history` open) |
| The scratch World itself | `world.ts`, `types.ts`, `history-index.ts` | a plain core2 builder target in `population.ts` | none (`core-port-world-scaffold` blocked) |

Smallest lift: the seven rows above, then delete `releaseRecentHistory`/`forgetLastValidatedWorld` calls in `src/bench/world.ts` and `src/core2/tooling/generated-world.ts`. Proof is the same town by record id in a drawn place before and after.

**2. Health condition pack.** Confirmed, and smaller than thought: the **game** does not use it. `src/core2/condition-pack.ts` and `src/core2/modules/health.ts` already own conditions and onsets. The only users are the calibration fixture `tests/fixtures/synthetic-cohort.ts` (it calls the **old** `conditionOnsetDay` and `STRAIN_THRESHOLD`, so `tests/mortality-calibration.test.ts` currently calibrates old-engine code, not the game's onset path) and the dead script `scripts/dev-lab/expected-deaths.ts`. Lift: move `conditionOnsetDay` (about 45 lines) into `src/core2/condition-pack.ts` (or point the fixture at the onset function `modules/health.ts` already uses) and `STRAIN_THRESHOLD` (4 lines) into `src/core2/health-hazard.ts`; delete `expected-deaths.ts`.

**3. Jobs the "two jobs" list missed.** Data builders (`build-place-lookup-data.ts`: rule packs, seats of government, state reference), four exporters that write their output into `src/simulation/` (`office-pay.generated.ts`, `school-name-patterns.json`, `area-residents.generated.ts`, `town-council-profile-inputs.generated.ts`), `data/tables/index.ts`, and the art pipeline through `src/presentation/` (22 `scripts/art-asset-factory` files, 5 tests, `src/bench/appearance.ts`, `src/bench/creator.ts`). Each needs a new home (`data/` for generated tables, `src/core2/reference/` for rule packs, `src/core2/appearance/` or `art/` tooling for the appearance engine) before the folder can go.

### Other second-engine remnants

| Path | Files | Finding |
| --- | ---: | --- |
| `src/source/` | 3 | No importer anywhere; only two `tsconfig.app.json` lines. Delete. |
| `src/education/tuition-prices.ts` | 1 | Imported only by 4 old-core files. Delete with the old core (or now, with those 4). |
| `src/fiscal-authority/` | 2 (0.14 MB) | Imported only by `simulation/tax-policy.ts`. Delete with the old core. |
| `src/districts/` | 13 (12.4 MB) | 8 old-core importers, but `src/core2/offices-state.ts` and `modules/residents.ts` read it. Keep; its old-core test goes. |
| `scripts/dead-code/reachable.mjs` | 1 | Duplicates `scripts/core2-guard/old-imports.mjs` (PR #5078). Keep one. |
| Ownership-boundary tests | 5 + support | `tests/{authoring-ownership-boundary, authoring-ownership-boundary-harness, executive-governing-ownership-boundary, judicial-gameplay-ownership-boundary, narrative-wave-ownership-boundary}.test.ts` and `tests/support/ownership-boundary`: pinned to September PR waves (#85, #101, #112) and old-core paths. Delete. |
| `tests/simulation-loads-under-tsx.test.ts` | 1 | Tests the old core loads. Delete with it. |
| `src/core2/gov-rules.test.ts`, `gov-rules/given-name-cohorts.test.ts` | 2 | Old-versus-new parity checks; their subject is the old core. Delete with it. |

## B. Dead and duplicate code

### B1. Folders and their importers

| Folder | Files | Size | Importers outside it | Verdict |
| --- | ---: | ---: | --- | --- |
| `src/maps` | 56 | 28.4 MB | none by import; `src/bench/map.ts` loads `geometry/states/*.json` by URL | keep (it is data; move to `data/` or `public/` later) |
| `src/presentation` | 15 | 0.3 MB | 25 non-test (22 art scripts, `src/bench/appearance.ts`, `src/bench/creator.ts`, `src/authoring`) | old engine; lift appearance engine, then delete |
| `src/authoring` | 6 | 0.1 MB | `scripts/dev-lab/compiled-art-usage.ts` only | art desk; delete with its script unless the art desk is still used |
| `src/education` | 1 | 0.02 MB | old core only | delete |
| `src/fiscal-authority` | 2 | 0.14 MB | old core only | delete |
| `src/source` | 3 | 0.01 MB | none | delete now |
| `src/districts` | 13 | 12.4 MB | core2 (2) + old core (8) | keep |
| `src/english`, `src/rules`, `src/release` | 22 | 0.1 MB | bench, director, core2 | keep |

### B2. `scripts/` (472 files, 47 folders): overlaps

| Folders | Files | Overlap |
| --- | ---: | --- |
| `prose-corpus`, `prose-eval`, `english-corpus`, `english-mining`, `english-check`, `dialogue-batch`, `dialogue-report`, `runtime-text` | 16, 41, 35, 13, 2, 17, 1, 8 | Eight folders for grading, mining and checking text. `dialogue-report` and `dialogue-batch` both report on graded batches; `english-check/wording.ts` and `runtime-text/guard.ts` both scan player text; `prose-corpus/sources/episodes.ts` reads old-core episode banks. Fold into two: `scripts/english/` (banks, grading) and the guards. |
| `office-day`, `office-day-federal`, `office-day-state`, `office-records`, `filing-status`, `turnout-reasons`, `wide-races`, `justice`, `press`, `gov-wiring`, `world-proofs`, `core2-year`, `speed-years` | 1, 3, 1, 1, 1, 1, 1, 1, 1, 10, 9, 25, 5 | Thirteen folders of one-off "run a year and print" proofs, each from one session. `core2-year` is the wired one (`npm run all-places`); `speed-years` is wired (`speed:year`). The other eleven duplicate it. |
| `dead-code/reachable.mjs` vs `core2-guard/old-imports.mjs` (PR #5078) | 1 + 1 | Same reachability walk. |
| `traits/` vs `trait-effects/` | 2 + 2 | `traits/personality-catalogue.ts` regenerates old-core data; `trait-effects` is the wired manifest. |
| `audit/`, `report-check/`, `law-audit/` | 4, 4, 1 | `law-audit/` is one 57 KB JSON inventory, no script. |
| `art-asset-factory` | 93 | Wired (22 package scripts) but carries old-core imports; `derive-g-press.ts` imports a missing `./tier-derive` (broken). |
| Root one-offs | 20 | `dehardwire-census.mjs` (one-time migration), `claude-cloud-permissions.mjs`, `local-gate.mjs`, `agent-run-receipt.mjs`: check each still runs. |

### B3. Tests whose subject is gone

387 of 568 test files have no same-named source file, but a sample of 30 of them shows **all 30 import only live core2/bench/director code** (they are named for behaviour, not files). The dead tests are the ones that import the old core or pin old history: the 10 old-core importers above, the 19 tests inside `src/simulation/`, the 5 ownership-boundary tests, `tests/simulation-loads-under-tsx.test.ts`, and `tests/mortality-calibration.test.ts` until its fixture is moved. About **37 test files**.

### B4. Large and generated files committed

| What | Files | Size | Finding |
| --- | ---: | ---: | --- |
| Files over 2 MB | 147 | 1,321 MB | 53 in `data/source` (757 MB), 31 in `art/references` (262 MB) |
| `data/source/*/raw/` captures | | largest 92 MB (`cbsa-delineations/raw/acs-2023-geos-5yr.txt`), 85 MB `place-county-relations/corpus.json`, 82 MB `education/corpus.json` | Pinned publisher bytes; keep, but they belong in LFS or a release asset, not every clone |
| `public/education/catalog-*.json` | 3 | 82 MB | Read only by `scripts/source/place-name-corpora.ts` and the old core's `school-name-patterns.json`; no runtime reader in `src/`. Shipped to every player. |
| `src/simulation/crisis/storm-catalog.generated.json` | 1 | 5.8 MB | Old core |
| `docs/codex/ui-logo-packet/` | | 6+ MB images | Duplicates `public/branding/emblem-final.png` (2.4 MB twice) |
| `docs/reports/` | 288 | 82.8 MB | `kit13-controls-2026-10-14/` 30 files 34.5 MB, `ui-kit12-2026-10-14/` 55 files 11.6 MB, `trace-audit-2026-10-14/` 47 files, `people-shots/` 30 files: screenshot dumps |
| Screenshot-named files | 34 | 25.6 MB | |
| `test-results/` | 14 | 0.2 MB | Committed although `.gitignore` lists it |
| `data/english/batches/*.json` | 8 | 0.7 MB | PR #5105/#5117 already deciding |
| Snapshot-named files | 22 | 0.4 MB | |

_Sections C–F follow in the next commit._
