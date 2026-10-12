# Board

Only the CTO writes this file. Each session keeps its own status file in this folder (see "The team" in `AGENTS.md`).

## Who owns what

| Session     | Status file | Branch                                                 | Model        | Starts             |
| ----------- | ----------- | ------------------------------------------------------ | ------------ | ------------------ |
| OPUS-CORE   | `core.md`   | `opus-core`, from `pool/M0-core-pieces`                | Opus, high   | Mon Oct 12, 3 a.m. |
| OPUS-GOV    | `gov.md`    | `opus-gov`, from `pool/M1-laws` plus RULES-2's shelves | Opus, medium | Mon Oct 12, 3 a.m. |
| OPUS-PEOPLE | `people.md` | its current `pool/P15-people-5`                        | Opus, high   | Mon Oct 12, 3 a.m. |
| OPUS-PLAY   | `play.md`   | `opus-play`, from `pool/M0-bench`                      | Opus, medium | Mon Oct 12, 3 a.m. |
| OPUS-WORLD  | `world.md`  | `opus-world`, from `pool/M1-macro`                     | Opus, medium | Mon Oct 12, 3 a.m. |
| FIXER       | `fixer.md`  | `fixer/<bug>`, one per bug                             | Sonnet, high | Mon Oct 12, 3 a.m. |

All six start at 3:07 a.m. Monday from one-off routines on the coordinator account.

## Order of work right now

1. **OPUS-CORE: speed first** (bookkeeping off in play, no copying of worker memory each shift), then the two-level population, then the business closures.
2. **OPUS-PEOPLE:** steps 1 and 2 (a life at 18, meeting people) ready to play, people in the two-level world with OPUS-CORE, then the English engine on the new core (conversations, scenes, the journal).
3. **OPUS-PLAY:** the bench on the full stack, the tagged art library wired into every scene (owner, Oct 12: use the 1,000+ images we have, best match, no waiting for perfect), and the first evening build.
4. **OPUS-GOV:** laws in force, then offices and seats, then filing (step 3), campaigning (step 4), and elections (step 5) that read each candidate's record (step 11).
5. **OPUS-WORLD:** the national economy, then state and metro.
6. **FIXER:** main's red checks (the release build; the two instruction-file tests from the drifted skill folders; merging main into the speed map, #3975); then open work below whenever no bug is assigned.

After its checklist, every session keeps going through its area's specs in every later milestone (`docs/roadmap/later-specs-draft.md`), then the open work below.

## Merge order

The core first, then government, people and world on top, then the evening build. The CTO merges; nobody merges their own work. The core onto main needs the owner's approval.

## Open work anyone can take

The whole game gets built, not just tonight's list (owner, Oct 12; "No stopping" in `AGENTS.md`). A session whose own list is done takes from here: write "Taking <item>" in your status file before starting, build it in files of its own on your branch, and the CTO records it here at the next check-in.

- **Golden-path runner, FIXER next (CTO, Oct 12, 6:30 a.m.):** the PR suite is near its 300 s budget (GOV 252 s, PEOPLE 288 s, more specs coming), and most of each spec's time is process startup and module loading. Change `tests/golden-path/runner.mjs` to run the registered vitest specs in one process. If one process still runs over, raise the PR budget to 600 s in the same PR and say so. Never drop or trim a check to fit. Pillars keep registering their specs.
- **M1-13 Other places, coarser:** other places' populations and views change from their own conditions, and their public events are recorded for the news.
- **M1-14 History before your start:** a new game opens on its start date with dated life events, the economy's recent path, laws' dated changes and prior budgets.
- **M7-04 Updates and bug reports:** in-game bug reports with logs, and crash reports.
- **M7-05 Legal check:** no real politicians anywhere; real places, schools and institutions, data, photo and art licenses checked and listed.
- **Specs marked "anyone free"** in `docs/roadmap/later-specs-draft.md` (staff, interest groups, constituent cases, other governments legislating, Congress and president), when their owner hasn't started them: check the owner's status file on its branch first.

## Open stand-ins

The CTO lists every registered stand-in here, by session, at each check-in (owner, Oct 12): what it fakes and which session's work replaces it. As of Oct 12, 4:25 a.m.:

- **OPUS-GOV, waiting on OPUS-CORE:**
  - `SG-GOV-wage-floor-rate-write`: the laws module rewrites underpaid jobs' hourly rates on the minimum wage's date, until CORE has a pay-change API.
  - `SG-GOV-official-identity-only`: state and federal officials are identities only, until CORE's fill-in builds them.
- **OPUS-WORLD, waiting on OPUS-GOV:** `SG-WORLD-board-appointments`: central bank seats are filled at the opening, until GOV's appointments (nominate and confirm).
- **Own later items (no wait on others):**
  - GOV: `SG-GOV-special-election-appointee` until elections; `SG-GOV-term-end-estimate`.
  - WORLD: `SG-WORLD-credit-line-stand-in` until banks; `SG-WORLD-macro-*` estimates.
  - PEOPLE: journal templates until composed from mined speech; `SG-P15-school-assignment` until homes have locations.

## Open requests between sessions

- **Core requests (4:22 a.m.):** seven requests to OPUS-CORE collected on #3999 (WORLD's api v11/v12, GOV's pay-change API and opening pay from the start date's law, fill-in for named officials, PEOPLE's `peerCohortSize`, PLAY's own-choice resume, speed numbers).
- **Bench screens (4:23 a.m.):** six ready-to-wire screens for OPUS-PLAY on #4002 (steps 1 and 2, My life, who governs you, law here, the national economy).
- **PEOPLE ↔ GOV:** GOV wants officials' stances with reasons from PEOPLE's views engine (on #3956).
- **OPUS-PEOPLE → OPUS-PLAY (Oct 12, 3:36 a.m.):** bench screens for step 1 (the 18-year-old's family, schools and the record behind each fact) and step 2 (the circle, each meeting, why a tie grew closer). The data is `pastFacts`, `knownIds` and each relationship's `latestChange` on `pool/P15-people-5`. PLAY's bench item already brings that branch in.
- **OPUS-PEOPLE → CTO, answered (3:40 a.m.):** the PR suite is at about 288 s of its 300 s budget. Keep M0-06 and M0-07 in the PR suite; it's the check that protects steps 1 and 2. Load each place's data once per suite run instead of once per check. If the suite still passes 300 s, raise the PR budget to 450 s in the same PR and say so; don't move the checks to nightly.
- **OPUS-PLAY:** staging spots for the 25 new places on draft PR #3994 (`art/places-batch2`). This is the first step of PLAY's art item. The CTO merges #3994 once its anchors test is green.

## Owner decisions in force

- Keep it simple (`AGENTS.md`): two-level population, bookkeeping off in play, one run and one number, build only what the golden path needs, something to play every evening.
- No session is capped; checklists are an order of work.
- Owner, Oct 12, 8:49 a.m.:
  - The new core (#3999) is approved to merge onto main.
  - A skip never stops for a routine work shift the character attends on its own (M0-03 updated).
  - Real school names that honor presidents stay.
  - There is no attorney on the project; the legal check is our own review.
- Main is green as of Oct 12, 4:20 a.m. (1a1870742).
- Owner, Oct 12, 1:55 a.m.: _The Political Process_ is the baseline. The game does everything it does, then goes deeper (`docs/roadmap/political-process-baseline.md`). Committee hearings, election-night exit polls and custom world options are added. Use the generated art now.
- Owner, Oct 12: no stopping. The sessions build the whole game: after their checklists, their area's later-milestone specs, then open work. Nothing waits on another session or on the owner; the only stop is running out of usage.
- Owner, Oct 12: the English engine (conversations, scenes, the journal, people bringing things up) belongs to OPUS-PEOPLE; campaigning (step 4) and the next election reading the record (step 11) belong to OPUS-GOV.
- Checks stay light: own tests, the automatic golden-path and speed guards and money balance, the owner plays the evening build.
- Steam store page by Friday, October 16; the early-access date is set once the owner has played the golden path end to end (target October 30).
