# File claims

| Team                      | Files                                                    | Claimed at                                                                                    |
| ------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Team 5 cloud continuation | `docs/codex/claims.md`, `docs/codex/handbacks/team-5.md` | September 29, 2026, 10:59 p.m. Eastern; single cloud checkout `/workspace/Political-Game-Git` |

Team 5 requested central reconciliation in the 00 coordinator document before
source edits. Continued press ownership requested: `src/simulation/press/desk.ts`,
`src/simulation/press/law-effect-news.ts`,
`src/simulation/press/law-effect-news.test.ts`, and
`src/simulation/press/opening-archive.test.ts`. This row declares documentation
ownership only; it does not release another session's source claims.

Shared schema and generation paths remain with their existing owners:
`src/simulation/types.ts` (Team 1), `src/simulation/character-history.ts` (Team 4),
and `src/simulation/world-setup/types.ts` (Team 2). No edits without coordinated
handoff. Claude owns appearance-engine and life-scene-people renderers. Team 8's
calendar migration is disjoint; News, dossier, meeting and opening overlap must
be coordinated before English changes.

## Accepted cloud transfer

The coordinator accepted Team 5's transfer and archived the local predecessor
with its work and evidence preserved. Team 5's inherited claims now belong to
this cloud continuation. The paths below restate that scope; shared schema and
generation ownership above remains separate.

| Team                                    | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Claimed at                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Team 5 cloud, inherited press           | `src/simulation/press/desk.ts`, `src/simulation/press/opening-archive.test.ts`, `src/simulation/press/law-effect-news.ts`, `src/simulation/press/law-effect-news.test.ts`, `docs/release/changes/wave1-law-news-readers.md`                                                                                                                                                                                                                                                                                                                                                                                           | Accepted transfer, September 29, 2026 |
| Team 5 cloud, inherited content/history | `src/player/SavedAppearance.tsx`, `src/player/opening-life/OpeningLifeFlow.tsx`, `src/player/opening-life/OpeningLifeFlow.test.tsx`, `tests/canned-content-guard.test.ts`, `src/presentation/person-dossier.ts`, `src/presentation/person-dossier.test.ts`, `src/player/ShellDossier.tsx`, `docs/release/changes/wave1-record-backed-content.md`, `src/simulation/living-world/developments.ts`, `src/simulation/pressure/events.ts`, `src/simulation/pressure/events.test.ts`, `src/presentation/news-headlines.ts`, `src/presentation/news-headlines.test.ts`, `src/presentation/living-world-developments.test.ts` | Accepted transfer, September 29, 2026 |
| Team 5 cloud, inherited meeting         | `src/simulation/life-opportunities.ts`, `src/simulation/ordinary-meeting-presence.ts`, `src/simulation/ordinary-meeting-presence.test.ts`, `src/player/PersonCard.tsx`, `src/presentation/ordinary-meeting-scene.test.ts`, `src/simulation/life-circumstances.ts`                                                                                                                                                                                                                                                                                                                                                     | Accepted transfer, September 29, 2026 |
| Team 5 cloud, inherited playtest        | `docs/codex/handbacks/09-routing.md`, `src/player/TitleScreen.tsx`, `src/player/World39News.tsx`, `src/player/CampaignWorkspace.tsx`, `docs/release/changes/wave1-playtest-copy.md`, `src/player/SetupScreen.tsx`, `src/player/PlayerSurfaceProvenance.test.tsx`, `src/presentation/day-opening-english.ts`, `src/presentation/day-opening-english.test.ts`, `src/simulation/person-context.ts`, `src/presentation/people-continuation.ts`, `src/simulation/macro-economy/sources.ts`                                                                                                                                 | Accepted transfer, September 29, 2026 |

The newest Team 8 scope supersedes its earlier calendar proposal:
`src/player/JobListingsPanel.tsx`, new
`src/presentation/job-listings-english.ts`, and its test. Team 8 does not edit
ShellWorkspaces or the calendar in this migration. Team 5 leaves those newly
reserved job-listing paths alone.

Proposed new press habit/uptake record kinds and their integrity/index tests
are not additional claims yet. Their exact paths and generation hooks are
being coordinated with Teams 1, 2 and 4 before source edits.

| Team               | Files                                                                                                                                                                                                       | Claimed at                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Team 4 cloud speed | `docs/codex/handbacks/team-4-cloud-speed.md`; ignored `test-results/speed/profile-month.ts`, `test-results/speed/cloud-*`, `test-results/speed/current-main-month*`                                         | Cloud transfer checkpoint; source helpers remain limited to the four released helpers and state intake. A measured fix will name its exact source/test paths before editing. |
| Team 4 cloud speed | `src/simulation/character-history.ts`: existing published lazy-copy context-person hunk only; `src/simulation/character-history-context-people.test.ts`; `docs/release/changes/context-people-lazy-copy.md` | Same-machine measurement of exact PR 1151 delta `040c538b21bb92b162f25a8733087647636db550`, absent from current main. No other character-history hunk released.              |

## Team 5 ordered playtest item 1

Owner/CTO 12:08 assignment: remove menu short-walk/home offers, preserve real
activity journeys and conversation content. Exact claims: `src/presentation/player-places.ts`
walk projection/helpers/imports; `src/presentation/player-places.test.ts` retired
walk-menu assertions; `src/player/opening-life/LifeScenePanel.tsx` walk-button
block/imports only; `tests/e2e/ui9-owner-corrections.spec.ts` retired walk-offer
case only; `docs/release/changes/remove-menu-short-walks.md`; Team 5 handback.
No PlayerGame, life-scene-flow writer, neighborhood conversations or Claude
scene-people rendering claim. Item 5 dossier regression remains on its preserved
branch until the ordered items preceding it are complete or blocked.

| Team 8 English Engine | `scripts/english-check/wording.ts`; `scripts/english-check/wording-baseline.json`; `tests/player-wording.test.ts`; `src/player/JobListingsPanel.tsx`; `src/presentation/job-listings-english.ts`; `src/presentation/job-listings-english.test.ts`; `docs/codex/handbacks/team-8.md`; `docs/release/changes/team-8-jobs-english.md` | September 29, 2026, cloud continuation |

| Team 4 state intake | `src/simulation/history-index.ts`: append-copy transaction and appendedList hunk only; `src/simulation/history-index.test.ts`; `src/simulation/nationwide-world/state-legislature-turnover.ts`: existing seedDates traits batch only; `docs/codex/handbacks/team-4-state-intake.md`; `docs/release/changes/state-intake-history-copies.md` | Parent `0b739f88be83fda9ba4a911adaa2330eaca4ad9c`. Restrict copying transaction to incumbent trait preparation; ordinary arrays restored before decisions and candidate slates. Both rejected wider experiments preserved and reverted. |

| Team 4 self-starter copies | `src/simulation/nationwide-world/state-legislature-candidates.ts`: existing self-starter decision call and history-index import only; `src/simulation/nationwide-world/state-legislature-candidate-copies.test.ts`; `docs/codex/handbacks/team-4-self-starter-copies.md`; `docs/release/changes/self-starter-history-copies.md` | Parent PR 1175 at `2ba8c429c3f57645d0d520390266bba008ec01c0`. Reuse its copy transaction at the existing actor call; no new batch, seed, eligibility rule, date or write-order change. |

## Team 5 ordered item 2 — released September 30, 1:10 a.m. Eastern

Exact owner release: `src/player/WorldOrientationPanel.tsx` locality-only
SceneBackdrop mount; `src/player/WorldOrientationRegionPlate.test.tsx` obsolete
locality image assertions. Also Team 5 claims/handback and dedicated
`docs/release/changes/locality-card-text-only.md`. No other orientation renderer,
executive/state card, art selection, people engine or shared schema hunk.

## Team 5 bedrock ledger — September 30, 1:30 a.m. Eastern

Team 5 owns `docs/codex/handbacks/team-5-bedrock-numbers.md` and the
public-record audit in its existing handback. Read-only numeric inventory of
inherited Team 5 source paths; no coefficient, shared type, history writer,
Claude renderer, or Team 8 English engine edit is claimed.

## Preserved incoming Team 1 and historical claims

| Team                  | Files                                                                                                                                                                                                                                                                                                                              | Claimed at                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Team 4 cloud speed    | `docs/codex/handbacks/team-4-cloud-speed.md`; ignored `test-results/speed/profile-month.ts`, `test-results/speed/cloud-*`, `test-results/speed/current-main-month*`                                                                                                                                                                | Cloud transfer checkpoint; source helpers remain limited to the four released helpers and state intake. A measured fix will name its exact source/test paths before editing. |
| Team 4 cloud speed    | `src/simulation/character-history.ts`: existing published lazy-copy context-person hunk only; `src/simulation/character-history-context-people.test.ts`; `docs/release/changes/context-people-lazy-copy.md`                                                                                                                        | Same-machine measurement of exact PR 1151 delta `040c538b21bb92b162f25a8733087647636db550`, absent from current main. No other character-history hunk released.              |
| Team 8 English Engine | `scripts/english-check/wording.ts`; `scripts/english-check/wording-baseline.json`; `tests/player-wording.test.ts`; `src/player/JobListingsPanel.tsx`; `src/presentation/job-listings-english.ts`; `src/presentation/job-listings-english.test.ts`; `docs/codex/handbacks/team-8.md`; `docs/release/changes/team-8-jobs-english.md` | September 29, 2026, cloud continuation                                                                                                                                       |

| Team 4 state intake | `src/simulation/history-index.ts`: append-copy transaction and appendedList hunk only; `src/simulation/history-index.test.ts`; `src/simulation/nationwide-world/state-legislature-turnover.ts`: existing seedDates traits batch only; `docs/codex/handbacks/team-4-state-intake.md`; `docs/release/changes/state-intake-history-copies.md` | Parent `0b739f88be83fda9ba4a911adaa2330eaca4ad9c`. Restrict copying transaction to incumbent trait preparation; ordinary arrays restored before decisions and candidate slates. Both rejected wider experiments preserved and reverted. |

## Team 1: independent officeholder life formation and bedrock audit

CTO's September 30, 2026, 1:10 a.m. dispatch assigns Team 1 the independent
main-based split of PR1152. The 1:30 a.m. dispatch adds a numbered continuous
strength design and Team 1's bedrock ledger. This branch is
`codex/team1-officeholder-life-main`, based on main
`1d8556c563415ae6fa261148ed64fbad35928996`.

Exact source claims: `src/simulation/governing/officeholder-principles.ts`
(the life-formation caller and removed seeded draw only), its test,
`src/simulation/principles-from-life.ts` and its test. Team 2 retains unrelated
agenda, Senate, consent, resolver and clock work. No new strength weights,
shared types/history/politics writers or other consumers are claimed yet.

Exact documentation claims: this additive claims section,
`docs/codex/handbacks/team-1-officeholder-life.md`,
`docs/codex/designs/team-1-continuous-principle-strength.md`,
`docs/codex/bedrock/team-1-laws.md`, and
`docs/release/changes/officeholder-life-main.md`.

The original PR1152 branch and law branch remain preserved. PR1168's published
head is unchanged by this branch. The narrow Team 2 and Team 3 releases posted
in 00 remain in force; CTO's events-only budget fixture ruling supersedes the
older broader fixture release. Continuous schema and weight implementation
waits for the numbered design decision and exact shared writer claims.

### Updated overnight scope

CTO's 1:40 correction replaces further numerical inventory with one page of
why-chains; the existing ledger remains historical supporting evidence.
The 2:05 plan assigns continuous life-derived strength as a HELD draft.
Team 1 additionally claims `docs/codex/handbacks/team-1-why-chains.md`
`docs/codex/handbacks/team-1-principle-example.json`,
and ignored `test-results/team1/principle-life-example.ts` for a read-only
named example. No additional shared source hunks are claimed by this update.
The continuous design's evidence contract can be refined without coding
unapproved weights. PR1184 is now draft; original PR1152 remains preserved.

### Account-switch preservation checkpoint

Team 1 claims `docs/codex/handbacks/team-1-transfer-evidence.json` only
for preserved check logs and the ignored extraction script. CTO's 2:15
dispatch reprioritizes Team 1 to six-line traces for twenty federal catalog
questions and ten held-branch laws. Those traces are NOT STARTED. The owner
now requests a safe stop; no new source implementation or tests are started.

## Team 9 bill-number research

| Team                     | Files                                                                                                                                                                                                                         | Claimed at                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Team 9 Standing Research | `data/research/standing-research/team-9/bill-numbers.md`; `data/research/standing-research/team-9/bring-first-queue.md`; `docs/codex/handbacks/team-9-bill-numbers.md`; `docs/release/changes/team-9-bill-number-research.md` | September 29, 2026, CTO 11:12 dispatch; research only |

Team 9 owns only its additive row on this branch. The prior homelessness/Wave 2 delivery and its claims remain preserved on PR 1166. This branch follows the newer bill-number-first queue without changing that ready delivery. The lead is the sole repository writer; only the same two authorized Low researchers supplied findings. No game-code path is claimed. Central claims reconciliation is requested in 00.
