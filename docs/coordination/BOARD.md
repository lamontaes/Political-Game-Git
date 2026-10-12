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

- **M1-13 Other places, coarser:** other places' populations and views change from their own conditions, and their public events are recorded for the news.
- **M1-14 History before your start:** a new game opens on its start date with dated life events, the economy's recent path, laws' dated changes and prior budgets.
- **M7-04 Updates and bug reports:** in-game bug reports with logs, and crash reports.
- **M7-05 Legal check:** no real politicians anywhere; real places, schools and institutions, data, photo and art licenses checked and listed.
- **Specs marked "anyone free"** in `docs/roadmap/later-specs-draft.md` (staff, interest groups, constituent cases, other governments legislating, Congress and president), when their owner hasn't started them: check the owner's status file on its branch first.

## Open stand-ins

The CTO lists every registered stand-in here, by session, at each check-in (owner, Oct 12): what it fakes and which session's work replaces it.

None yet.

## Open requests between sessions

None yet.

## Owner decisions in force

- Keep it simple (`AGENTS.md`): two-level population, bookkeeping off in play, one run and one number, build only what the golden path needs, something to play every evening.
- No session is capped; checklists are an order of work.
- Owner, Oct 12, 1:55 a.m.: *The Political Process* is the baseline. The game does everything it does, then goes deeper (`docs/roadmap/political-process-baseline.md`). Committee hearings, election-night exit polls and custom world options are added. Use the generated art now.
- Owner, Oct 12: no stopping. The sessions build the whole game: after their checklists, their area's later-milestone specs, then open work. Nothing waits on another session or on the owner; the only stop is running out of usage.
- Owner, Oct 12: the English engine (conversations, scenes, the journal, people bringing things up) belongs to OPUS-PEOPLE; campaigning (step 4) and the next election reading the record (step 11) belong to OPUS-GOV.
- Checks stay light: own tests, the automatic golden-path and speed guards and money balance, the owner plays the evening build.
- Steam store page by Friday, October 16; the early-access date is set once the owner has played the golden path end to end (target October 30).
