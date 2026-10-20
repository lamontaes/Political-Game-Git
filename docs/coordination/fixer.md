# FIXER: Standby bug fixer

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Only FIXER writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** Nothing of its own; works only on bugs the CTO assigns.
- **Branch:** one branch per bug, fixer/<short-name>.
- **Model:** Sonnet, high (Opus for a genuinely hard bug): bounded fixes, faster and cheaper.
- **Starts from:** Main's current red checks.

## What the owner can play now

Nothing new to play; the two PRs unblock the people branch's checks.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [x] **Main's red checks first.** The release build failing; the two instruction-file tests red because the Codex and Claude skill folders drifted; the speed map needing main merged in (#3975).
  - Verified by: Each check green on main.
- [x] **Assigned bugs (both CTO items from Oct 12, 4:25 a.m. done; PRs #4005 and #4006, draft).** Bugs from your evening playtests and checker failures; one bug per PR; no refactoring; inside a pillar's folders only with that pillar told.
  - **Assigned by the CTO, Oct 12, 4:25 a.m. (OPUS-PEOPLE asked for both; open each PR against `pool/P15-people-5`, never push to it):**
    1. **Zero-dice allowlist.** Add allowlist rows for OPUS-PEOPLE's generation picks that were on its branch before today: births' timing in `opening-kin.ts`, household ages in `opening-partnership.ts` (two lines), and the school name pattern in `deep-past.ts`. They are generation (who exists), keyed by household or person. The enrollment-weighted school pick in `deep-past.ts` is not generation: register it as a stopgap whose replacement is "the school follows from the home's location once homes have locations" (it may already exist as `SG-P15-school-assignment`; point the marker at it).
    2. **American English sweep exemption.** `tests/american-english-sweep.test.ts` fails on `pool/P15-people-5` over real proper names in generated data: school names in `src/core2/data/opening-schools.json` (NCES, e.g. "Harbor", "Center") and owner names in `src/core2/data/opening-public-owners-2017.json`. Add one `AMERICAN_ENGLISH_EXEMPT` row each in `scripts/prose-eval/american-english-scope.ts`, with the reason "real names from federal school and ownership records".
  - Verified by: A test that fails before the fix and passes after.
  - Needs: The owning pillar
- [x] **Assigned by the CTO, Oct 12, 5:52 a.m. (all three done; draft PRs #4009, #4010, #4011 against `main`; each edits this file's log, so expect a trivial merge).** First run `npm ci`: this environment has no setup script, and you couldn't run tests last time without it. One bug per branch and PR, against `main`:
  1. **Credits data (M7-05 follow-up).** The owner chose Credits under Options. Create the attribution list the Credits screen will read: one row per source whose license requires credit. That covers the 23 CC BY-SA campus reference photos (`art/campuses/manifest.json`: referenceLicense and referenceArtist), O\*NET 31.0 (CC BY 4.0, with the exact credit line in the legal check), the capitol reference photos' licenses in `art/backdrops/manifest.json`, and Census where a lock sets `attributionRequired`. Add a test that fails when a manifest entry's license requires attribution and the list lacks it. OPUS-PLAY wires the screen; you own the data and the test.
  2. **Real-name hygiene.** Remove the "People v. Trump" citation from `data/english/parts/sentencing.json` (nothing imports it today; the legal check flagged it). Extend `scripts/world/check-data-shipping.mjs` so the real-name list it guards also covers presidents and federal judges' names, as the legal check suggests.
  3. **Data rights fields.** Add the missing rights fields the legal check lists for the regional data locks and `acs-county-citizenship`; most are US government works. Record SHEEO's and the CRS mirror's terms as "to check" with the reason, and leave the replacement data source to research.
- [x] **Assigned by the CTO, Oct 12, 8:25 a.m. (both done: #4014 and #4015, merged).** Run `npm ci` first. One PR each, against `main`:
  1. **Release pipeline: "The built client does not carry version 0.6.0."** On main (9387bca), the Release workflow's "Validate candidate, repository" job fails at the step that runs `grep -rqF "v${NEXT_VERSION}" dist/client/assets` (the title screen should show `v` and the number, `displayVersion`). Everything before it passes, including the data-shipping scan. Find why the built client no longer carries the version string (the title screen label may have been removed in the menu reset, or `displayVersion` no longer reaches the bundle), and put it back where the release check expects it, or align the check with where the version now lives. A version number is record data, not hand-written text.
  2. **Golden-path runner** (open work on BOARD.md): run the registered vitest specs in one process; raise the PR budget to 600 s only if still needed. Never trim a check.
- [ ] **Assigned by the CTO, Oct 12, 9:50 a.m.** Run `npm ci` first. One PR against `main`:
  1. **Stand-in lister.** Write `scripts/stopgaps-report.mjs`: it reads `src/core2/data/stopgaps.json` and `src/director/data/stopgaps.json` and prints every open stopgap grouped by owning session (from the id prefix: SG-GOV, SG-WORLD, SG-CORE, SG-PLAY, SG-P8, SG-P10, SG-P15 and so on), then by kind: behavior (a simplified rule), figure (a number standing in for a researched value), text (wording) or art. Classify from each row's existing fields; count a row you can't classify as `unclassified` rather than guessing. Don't edit the registries: every pillar edits them, so changes would conflict at merge. Output plain Markdown the CTO can paste into BOARD.md's "Open stand-ins". Add `npm run stopgaps:report` and a test that a row with no owner or no clear kind is reported as such.
  - Verified by: the script's test; its output on `opus-play` matches the registry's open row count.
- [ ] **TOP PRIORITY (owner, Oct 12, 12:15 p.m.): take the old engine out.** The owner: the old game sitting next to the new one is bloat and a thousand points of failure; take it out. Main holds about 4,100 files under `src/`: the old engine and screens (`src/simulation` 1,944, `src/presentation` 1,014, `src/player` 333, plus smaller old folders) beside the new core (`src/core2` 298). Some old files are still used by the new game (for example the trait registry in `src/simulation`, parts of the English engine in `src/presentation`, and OPUS-GOV's lifted rules), so delete by what's reachable, not by folder:
  1. Branch `fixer/remove-old-engine` from `origin/opus-play` (it merges every pillar's work), and keep merging `origin/opus-play` in as it moves.
  2. Write `scripts/dead-code/reachable.mjs`: walk static and dynamic imports (ts, tsx, mjs, json) from the new game's entry points (`src/bench/**` server and client, `src/core2/**`, `src/director/**`, `src/release/**`, `tests/golden-path/**`, the vite and tsconfig entries the bench build uses, and every `package.json` script CI still runs for the new game), plus data files whose paths reachable code names as strings. Tests travel with the file they test.
  3. Write `docs/reports/old-engine-removal.md`: counts by folder; every old file the new game still uses, with who uses it (the keep list); everything unreachable (the delete list); and data folders only old code reads.
  4. Delete the unreachable source, tests, old-only scripts and data, and the CI steps that only check old code (for example `check:law-consequence-modules` and `check:trait-effects` if their folders go). Never delete `docs/`, `data/research/` or `data/source/` research and provenance.
  5. The old app entry (`src/main.tsx`, `src/App.tsx`, `src/player/**`) and the desktop and release builds that point at it switch to the new game's screen with OPUS-PLAY. Write what PLAY must provide under "Needs from other sessions" (an app entry and build target for `/play`); don't edit `src/bench/**` yourself.
     5b. **Keep the approved UI (CTO, 12:55 p.m.).** Some approved UI exists only in the old app: `src/player/SceneConversation.tsx`, `ConversationStrip.tsx`, the Kit 12/13 frame and letterpress styles (spec: `docs/ui/kit13/APPROVED-2026-10-04.md`), and whatever OPUS-PLAY lists under its Needs. Move those into the new game's area (with OPUS-PLAY) and put them on the keep list; never delete them.
  6. Verify on the branch: typecheck, lint, the golden-path suite, every test under `src/core2`, `src/bench` and `src/director`, and the bench starts and opens a town at `/play`. Open one draft PR against `main`. The CTO merges it right after PLAY's screen lands on main.
  - Verified by: the report's delete list is gone, the keep list is explained, and `/play` still opens a town with every new-game test green.
- [ ] **Next after the old engine (owner, Oct 12, 1:50 p.m.): remove the old people art.** The owner approved whole-figure people (`art/people-whole/`, one image per dressed person, cut out cleanly) and wants them to be the only people in the game. The layered people engine (`art/people-engine/v1`, about 5,200 PNGs of bodies, outfits, faces and hair) and the code that assembles it go. Order: OPUS-PLAY first switches scenes to `art/people-whole/manifest.json` (assigned on #4002), so no scene loses its people. Then, in one PR against `main`, delete `art/people-engine/**` and the assembly code and tests the new game no longer reaches (use your `scripts/dead-code/reachable.mjs`), and list what went in your report. Don't delete before PLAY's switch is on main.
- [ ] **When no bug is assigned:** take open work from `BOARD.md` (write "Taking <item>" here first).
  - Taking M7-05 Legal check (Oct 12): done as a research review in `docs/legal/legal-check-2026-10-12.md` (real people, data licenses, art rights, eight release actions). Not run: a real build's `dist` check. Owner decisions: AI art terms, campus CC BY-SA handling, school names honoring presidents.
  - Taking M7-04 Updates and bug reports (Oct 12): the pure report builder only (`src/release/bug-report.ts`: build identity, place and seed, recent log lines, private details trimmed; it builds the payload and never sends). OPUS-PLAY wires the button and the after-crash prompt; Steam updates and signing need credentials and stay with the owner and CTO.
  - Verified by: That item's own test.

## Needs from other sessions

- **OPUS-PLAY:** an app entry and build target for `/play` (root `index.html`, `review.html` and `vite.config.ts` inputs still name the deleted old app entry), so the web build works once #4036 lands.
- **OPUS-CORE / OPUS-GOV:** to delete the other ~1,600 old files, move what `src/bench/scene.ts`, `src/rules/legislatures`, `src/rules/economy` and `tests/golden-path/place.ts` import from `src/simulation` and `src/presentation` into core2 or rules.

**Stand-in figures (CTO list, Oct 12, 3:45 p.m.).** Of the 111 rows in `data/research/stand-in-figures-2026-10-12.json`, 44 are "not research" (a missing mechanic, no number to set) and 67 have a recommended value. FIXER replaced none of the 67 itself: 61 sit in files that an open pillar branch changes (checked with `git diff --name-only origin/main...origin/<branch>` for opus-core, opus-gov, opus-play, opus-world, opus-words, opus-web and pool/P15-people-5), and the other 6 either say "keep the current value" (`SG-P8-work-schedule-data`, `SG-P8-attendance-choice` is a check target and not a coefficient, `SG-P8-opening-customer-public-procurement`, `SG-P8-opening-employer-pay-calendar`) or name a code file whose numbers live in `src/core2/data/parameters.json`, which OPUS-CORE changes (`SG-P8-opening-customer-generation`: use the 2021 value 771 with the 2024 regional ratios once the owner rules on opening vintage; `SG-P8-opening-private-cash-buffer`: add real estate, 47 days). The CTO relays each pillar's rows; each row's recommended value and source are in the JSON file.

- **OPUS-CORE** (37 rows with a number to set; every code location is in a file an open pillar branch changes, so FIXER did not touch them):
  - `SG-P8-param-marriageReferenceAge` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-param-careHours` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-civicHours` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-stressBaseline` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-moodBaseline` — researchable, low, `src/core2/data/parameters.json`
  - `SG-P8-param-moodHalfLifeDays` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-stressHalfLifeDays` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-traitWeight` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-companyHorizonDays` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-moneyBufferDays` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-organizationReserveMonths` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-relationContactGain` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-opening-vintage` — researchable, medium, `src/core2/population.ts`
  - `SG-P8-param-fallbackAnnualWageMinor` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-deep-past` — bounded, medium, `src/core2/data/deep-past.json`
  - `SG-P8-opening-peer-network` — bounded, low, `src/core2/data/opening-peer-network.json`
  - `SG-P8-work-schedule-data` — bounded, medium, `src/core2/data/work.json`
  - `SG-P8-attendance-choice` — bounded, medium, `src/core2/data/work.json`
  - `SG-P8-work-time-reserve` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-business-books-priors` — bounded, medium, `src/core2/data/parameters.json`
  - `SG-P8-business-books-dynamics` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-opening-finance-cadence` — bounded, low, `src/core2/data/opening-finance.json`
  - `SG-P8-opening-retirement-income` — researchable, high, `src/core2/data/opening-income.json`
  - `SG-P8-param-openingRetirementClaimAgeYears` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementClaimTraitPullYears` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementCoveredFraction` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementCoveredTraitPull` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementMinimumCoveredMonths` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementBenefitReferenceCoveredMonths` — researchable, high, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementBenefitFactorMinimum` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-param-openingRetirementBenefitFactorMaximum` — researchable, medium, `src/core2/data/parameters.json`
  - `SG-P8-person-trait-diversity` — bounded, low, `src/core2/population.ts`
  - `SG-P8-opening-family-closeness` — researchable, medium, `src/core2/state.ts`
  - `SG-P8-opening-customer-generation` — researchable, medium, `src/core2/data/opening-customers.json`
  - `SG-P8-opening-customer-public-procurement` — bounded, low, `src/core2/data/opening-customers.json`
  - `SG-P8-opening-private-cash-buffer` — researchable, high, `src/core2/data/opening-capital.json`
  - `SG-P8-opening-employer-pay-calendar` — bounded, medium, `src/core2/opening-payroll-calendar.ts`
- **OPUS-PEOPLE** (19 rows with a number to set; every code location is in a file an open pillar branch changes, so FIXER did not touch them):
  - `SG-P15-params-uncalibrated` — bounded, medium, `src/core2/data/parameters.json`
  - `SG-P15-personality-mapping` — bounded, medium, `src/core2/data/opening-kin.json`
  - `SG-P15-distance-by-place` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P15-school-assignment` — researchable, medium, `src/core2/data/opening-schools.json`
  - `SG-P15-coworker-groups` — bounded, low, `src/core2/data/opening-coworkers.json`
  - `SG-P15-candidacy-weights` — bounded, low, `src/core2/data/candidacy/parameters.json`
  - `SG-P10-params-uncalibrated` — bounded, low, `src/core2/data/parameters.json`
  - `SG-P10-response-model` — bounded, medium, `src/core2/data/drives.json`
  - `SG-P10-event-severity` — bounded, medium, `src/core2/data/health.json`
  - `SG-P15-news-habits` — bounded, low, `src/core2/data/news/parameters.json`
  - `SG-P15-speech-reception` — bounded, low, `src/core2/data/speech/parameters.json`
  - `SG-P15-corruption-weights` — bounded, low, `src/core2/data/corruption/parameters.json`
  - `SG-P13-param-directorMomentFloor` — bounded, low, `src/director/data/director.json`
  - `SG-P13-param-directorWeightTieSociability` — bounded, low, `src/director/data/director.json`
  - `SG-P13-param-directorWeightMoneyRisk` — bounded, low, `src/director/data/director.json`
  - `SG-P13-param-directorTies` — bounded, low, `src/director/data/director.json`
  - `SG-P13-param-directorHalfLives` — bounded, medium, `src/director/data/director.json`
  - `SG-P13-param-directorAnniversaryHalfDays` — bounded, low, `src/director/data/director.json`
  - `SG-P13-past-fact-estimates` — researchable, medium, `src/director/data/director.json`
- **OPUS-GOV** (6 rows with a number to set; every code location is in a file an open pillar branch changes, so FIXER did not touch them):
  - `SG-GOV-term-end-estimate` — researchable, medium, `src/core2/modules/offices.ts`
  - `SG-GOV-voter-groups-stand-in` — bounded, medium, `src/core2/modules/voting.ts`
  - `SG-GOV-local-fiscal-year` — researchable, medium, `src/core2/modules/budgets.ts`
  - `SG-GOV-local-budget-split` — researchable, low, `src/core2/modules/budgets.ts`
  - `SG-GOV-veto-override-rule` — researchable, low, `src/core2/modules/legislature.ts`
  - `SG-GOV-committee-structure` — bounded, medium, `src/core2/modules/legislature.ts`
- **OPUS-WORLD** (5 rows with a number to set; every code location is in a file an open pillar branch changes, so FIXER did not touch them):
  - `SG-WORLD-macro-mortgage-spread` — researchable, high, `src/core2/macro-model.ts`
  - `SG-WORLD-macro-public-budget` — bounded, medium, `src/core2/data/macro/parameters.json`
  - `SG-WORLD-regional-territory-estimate` — researchable, low, `src/core2/regional-model.ts`
  - `SG-WORLD-housing-eviction-steps` — researchable, medium, `src/core2/modules/housing.ts`
  - `SG-WORLD-housing-mortgage-history` — researchable, medium, `src/core2/housing-mortgages.ts`

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12 (FIXER): old-engine removal refreshed on `fixer/remove-old-engine` (merged opus-play and main; restored `src/presentation/guide-terms.ts`, which `src/bench/server.ts` imports; the reachability script now treats `vite.config.ts` as an entry and counts a test as live only when its imports resolve; 123 tests of deleted code removed). Stand-in figures: no row could be set without editing a pillar-owned file, so all 67 are listed under "Needs from other sessions" by pillar.
- Oct 12 (FIXER): old-engine removal, draft PR #4036 (`fixer/remove-old-engine`): deleted 1,874 unreachable old files; ~1,600 stay until bench scene, rules and golden-path place stop importing them. Typecheck: 3 map-preview errors left (to delete) plus 3 predating in `src/bench/changes.ts`. Lint, golden-path and new-game tests not yet run. Nothing new to play; the web build waits on PLAY's `/play` entry. Checks on the branch: typecheck clean except 3 errors already on `opus-play`; golden-path no accepted regression; `src/bench`, `src/director`, `src/release`, `src/core2` tests 1,772 pass and 14 fail, and the 4 I re-ran fail the same way on `opus-play` (nothing from the deletion). Waiting on PLAY's `/play` entry.

- Oct 12 (FIXER): M7-04 bug report builder on `fixer/bug-report`: `src/release/bug-report.ts` builds the report (build, place and seed, last 500 log lines, note, crash error) with account names and emails taken out, and never sends. 4 tests pass (bare vitest config). Nothing to play yet: OPUS-PLAY wires the button and the after-crash prompt to `buildBugReport` and `serializeBugReport`, and the screen must show the text before sending. Steam updates and Mac signing still need the owner's accounts.

- Oct 12 (FIXER): golden-path runner on `fixer/golden-path-one-process`: plain `vitest run <files>` specs now run together in one vitest process (JSON report tells files apart; commands with flags still run alone); they share one drawn place and seed (`vitest-batch`). PR budget left at 300 s, since I can't measure here (no node_modules; the storage guard refuses `npm ci`). Checked the batching with a stub; CI to confirm and the CTO to say if 600 s is needed. The version fix is on `fixer/title-version`.

- Oct 12 (FIXER): credits data done on `fixer/credits-data`: `data/credits/credits.json` (86 rows: 83 CC BY and CC BY-SA reference photos, O\*NET with its exact credit line, Census finances and employment) and `tests/credits-list.test.ts` (fails when a manifest or lock needs credit and the list lacks it). Seven photos have no artist in the manifest, so their rows point to the source page; OPUS-PLAY can fill names later. The sweep failure on `fixer.md` (Harbor, Center) is #4006's exemption, not this branch. Next: real-name hygiene.

- Oct 12 (FIXER): #4005 zero-dice allowlist rows (guard: 6 new -> nothing new) and #4006 American English exemption, both against `pool/P15-people-5`. #4006's sweep test not run here (no node_modules); CI to confirm. M7-05 legal check written. Next: BOARD.md open work.

- Oct 12, 4:25 a.m. (written by the CTO): main is green at 1a1870742 after #4000 (docs format), #3998 (status files need no release note) and #3997 (skill folders); `pool/speed-plan` (#3975) has main merged in.
