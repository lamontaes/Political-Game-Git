# FIXER: Standby bug fixer

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
    2. **American English sweep exemption.** `tests/american-english-sweep.test.ts` fails on `pool/P15-people-5` over real proper names in generated data: school names in `src/core2/data/opening-schools.json` (NCES, e.g. "Harbour", "Centre") and owner names in `src/core2/data/opening-public-owners-2017.json`. Add one `AMERICAN_ENGLISH_EXEMPT` row each in `scripts/prose-eval/american-english-scope.ts`, with the reason "real names from federal school and ownership records".
  - Verified by: A test that fails before the fix and passes after.
  - Needs: The owning pillar
- [x] **Assigned by the CTO, Oct 12, 5:52 a.m. (all three done; draft PRs #4009, #4010, #4011 against `main`; each edits this file's log, so expect a trivial merge).** First run `npm ci`: this environment has no setup script, and you couldn't run tests last time without it. One bug per branch and PR, against `main`:
  1. **Credits data (M7-05 follow-up).** The owner chose Credits under Options. Create the attribution list the Credits screen will read: one row per source whose license requires credit. That covers the 23 CC BY-SA campus reference photos (`art/campuses/manifest.json`: referenceLicense and referenceArtist), O\*NET 31.0 (CC BY 4.0, with the exact credit line in the legal check), the capitol reference photos' licenses in `art/backdrops/manifest.json`, and Census where a lock sets `attributionRequired`. Add a test that fails when a manifest entry's license requires attribution and the list lacks it. OPUS-PLAY wires the screen; you own the data and the test.
  2. **Real-name hygiene.** Remove the "People v. Trump" citation from `data/english/parts/sentencing.json` (nothing imports it today; the legal check flagged it). Extend `scripts/world/check-data-shipping.mjs` so the real-name list it guards also covers presidents and federal judges' names, as the legal check suggests.
  3. **Data rights fields.** Add the missing rights fields the legal check lists for the regional data locks and `acs-county-citizenship`; most are US government works. Record SHEEO's and the CRS mirror's terms as "to check" with the reason, and leave the replacement data source to research.
- [x] **Assigned by the CTO, Oct 12, 8:25 a.m. (both done: #4014 and #4015, merged).** Run `npm ci` first. One PR each, against `main`:
  1. **Release pipeline: "The built client does not carry version 0.6.0."** On main (9387bca), the Release workflow's "Validate candidate, repository" job fails at the step that runs `grep -rqF "v${NEXT_VERSION}" dist/client/assets` (the title screen should show `v` and the number, `displayVersion`). Everything before it passes, including the data-shipping scan. Find why the built client no longer carries the version string (the title screen label may have been removed in the menu reset, or `displayVersion` no longer reaches the bundle), and put it back where the release check expects it, or align the check with where the version now lives. A version number is record data, not hand-written text.
  2. **Golden-path runner** (open work on BOARD.md): run the registered vitest specs in one process; raise the PR budget to 600 s only if still needed. Never trim a check.
- [x] **Assigned by the CTO, Oct 12, 9:50 a.m. (done on `fixer/stopgaps-report`).** Run `npm ci` first. One PR against `main`:
  1. **Stand-in lister.** Write `scripts/stopgaps-report.mjs`: it reads `src/core2/data/stopgaps.json` and `src/director/data/stopgaps.json` and prints every open stopgap grouped by owning session (from the id prefix: SG-GOV, SG-WORLD, SG-CORE, SG-PLAY, SG-P8, SG-P10, SG-P15 and so on), then by kind: behavior (a simplified rule), figure (a number standing in for a researched value), text (wording) or art. Classify from each row's existing fields; count a row you can't classify as `unclassified` rather than guessing. Don't edit the registries: every pillar edits them, so changes would conflict at merge. Output plain Markdown the CTO can paste into BOARD.md's "Open stand-ins". Add `npm run stopgaps:report` and a test that a row with no owner or no clear kind is reported as such.
  - Verified by: the script's test; its output on `opus-play` matches the registry's open row count.
- [ ] **When no bug is assigned:** take open work from `BOARD.md` (write "Taking <item>" here first).
  - Taking M7-05 Legal check (Oct 12): done as a research review in `docs/legal/legal-check-2026-10-12.md` (real people, data licenses, art rights, eight release actions). Not run: a real build's `dist` check. Owner decisions: AI art terms, campus CC BY-SA handling, school names honoring presidents.
  - Verified by: That item's own test.

## Needs from other sessions

- For the CTO: the Windows package job fails at `check:law-consequence-modules` ("manifest is out of date") on #4020 though the check passes on Linux for `main` and the branch. Not caused by #4020; worth assigning as its own bug.
- For the CTO: the Mac package job on #4020 fails in the desktop smoke test (`creator-derived-age` never shows "age 27," at `desktop/scripts/creator-drive.mjs:92`). Not caused by #4020; likely a creator-screen regression on `main`.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12 (FIXER): stopped for now, with #4020 (stand-in lister) and #4022 (bug report builder) open and watched. What's left on BOARD.md is engine work under OPUS-GOV and OPUS-CORE (M3-06 to M3-10, M1-13, M1-14), which needs the golden-path suite, and this environment can't install dependencies (the storage guard refuses `npm ci`, 343 MiB usable against 1.5 GiB needed). Next session with room: run `npm ci`, then take M3-06 Staff or whatever the CTO assigns. #4020's only red check is the Windows-only manifest failure noted under "Needs from other sessions".

- Oct 12 (FIXER): stand-in lister on `fixer/stopgaps-report`: `npm run stopgaps:report` prints open stand-ins by owner prefix, then behavior, figure, text, art or unclassified, as Markdown for BOARD.md. On `opus-play`'s registries it lists 182 open (159 core + 19 director + 4 core rows that have no status, counted open and flagged); 17 kinds are still `unclassified` and shown as such. Test (3 cases) passes; ran with a bare vitest config because the storage guard refuses `npm ci` here. The registries live on pillar branches, not `main`, so the script prints nothing there until they merge. Next: BOARD.md open work.

- Oct 12 (FIXER): golden-path runner on `fixer/golden-path-one-process`: plain `vitest run <files>` specs now run together in one vitest process (JSON report tells files apart; commands with flags still run alone); they share one drawn place and seed (`vitest-batch`). PR budget left at 300 s, since I can't measure here (no node_modules; the storage guard refuses `npm ci`). Checked the batching with a stub; CI to confirm and the CTO to say if 600 s is needed. The version fix is on `fixer/title-version`.

- Oct 12 (FIXER): credits data done on `fixer/credits-data`: `data/credits/credits.json` (86 rows: 83 CC BY and CC BY-SA reference photos, O\*NET with its exact credit line, Census finances and employment) and `tests/credits-list.test.ts` (fails when a manifest or lock needs credit and the list lacks it). Seven photos have no artist in the manifest, so their rows point to the source page; OPUS-PLAY can fill names later. The sweep failure on `fixer.md` (Harbour, Centre) is #4006's exemption, not this branch. Next: real-name hygiene.

- Oct 12 (FIXER): #4005 zero-dice allowlist rows (guard: 6 new -> nothing new) and #4006 American English exemption, both against `pool/P15-people-5`. #4006's sweep test not run here (no node_modules); CI to confirm. M7-05 legal check written. Next: BOARD.md open work.

- Oct 12, 4:25 a.m. (written by the CTO): main is green at 1a1870742 after #4000 (docs format), #3998 (status files need no release note) and #3997 (skill folders); `pool/speed-plan` (#3975) has main merged in.
