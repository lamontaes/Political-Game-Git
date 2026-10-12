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
- [ ] **When no bug is assigned:** take open work from `BOARD.md` (write "Taking <item>" here first).
  - Taking M7-05 Legal check (Oct 12): a listed audit of real people, places, schools, data and art licenses, in `docs/legal/`.
  - Verified by: That item's own test.

## Needs from other sessions

None yet.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12 (FIXER): #4005 zero-dice allowlist rows (guard: 6 new -> nothing new) and #4006 American English exemption, both against `pool/P15-people-5`. #4006's sweep test not run here (no node_modules); CI to confirm. Next: BOARD.md open work.

- Oct 12, 4:25 a.m. (written by the CTO): main is green at 1a1870742 after #4000 (docs format), #3998 (status files need no release note) and #3997 (skill folders); `pool/speed-plan` (#3975) has main merged in.
