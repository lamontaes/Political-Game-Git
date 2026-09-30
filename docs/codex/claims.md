# File claims

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
