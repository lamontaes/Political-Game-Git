# CRISIS — severe events (CRUNCH46 §11)

Status: **Active.** Increment 1 (K1 mortality, K2 health, K3 continuity
notices) implemented and tested locally; K4 disaster and K5 international
crisis in progress.

## Authority and workspace

- Packet: CRUNCH46 §00–00B, §11, §13 (Drive
  `1u70OSFIy2uBgePzq8AqV_L2onGgeKjzvcodOFTiSre0`), ALIVE44 chunk 6 (Drive
  `1wDpqx3b9a_O0iqLgxm3YREJNN469pC4LPyJ2eJWD_jA`), doc 69 commander-in-chief
  research (Drive `1Gjh7aJ3cLByhRlZLZv93vRqnZXMj6tG0Gab5ZZeEW-4`).
- Session: Claude Code local `political-game-claude-runtime-proof-c2`.
- Clone: `~/Documents/PG-CRISIS`, branch `claude/crisis-severe-events`, base
  main `fed321f7667bbe5c3570679554a2f6b88d3bf8b1`.
- Owned: `src/simulation/crisis/**`, `docs/systems/crisis-severe-events.md`,
  this plan, `docs/release/changes/crisis-*.md`.
- Shared registration only (separate adapter commit): `types.ts`, `world.ts`,
  `future-transitions.ts`, `vitality-integrity.ts`, `campaigns.ts`,
  `simulation/index.ts`, `presentation/ordinary-life.ts`.

## Peers and interfaces

| Lane      | Session                                                       | Interface                                                                                                                                       | State                                                           |
| --------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| GOVERNING | Local state governing continuity (`~/Documents/pg-governing`) | `crisisOfficeContinuityNotices` → lawful succession (25th Am. §1–§3, 3 USC 19, House special election, Senate/governor packs, truthful blocked) | ACK; K3 consumer sequenced after GOVERNING's current increments |
| PEOPLE    | Local prose content implementation (`~/Documents/PG-PROSE`)   | `crisisPersonDeathNotices` → family and controlled-person continuation                                                                          | sent                                                            |
| CHANGE    | `-d7` (`~/Documents/PG-CHANGE`)                               | `crisisEnvelopesBetween` monthly; physical units only, no dollars                                                                               | ACK                                                             |
| PRESS     | `-85`                                                         | public CRISIS events                                                                                                                            | informed                                                        |
| WORLD     | `-f1`                                                         | additive `history.crisisRecords` registration                                                                                                   | sent                                                            |

## Increments

1. K1 + K2 + K3 notices — implemented, 17 tests.
2. K4 flood/severe-storm chain — implemented, 6 route tests through
   `passOrdinaryDays` on a production opening.
3. K5 international crisis (one non-force, one force-capable route with War
   Powers clocks) — after K4.

## Open decisions and limits

- No researched condition pack exists, so no named diagnosis or prognosis is
  possible; episodes are labeled simulation episodes.
- No background frequency is authored for disasters or international
  incidents; the first wave uses declared episodes (packet: "sourced/declared
  hazard episode, not a claimed local annual prediction").
- Until PEOPLE's continuation lands, the controlled person's death has no
  continuation route in play.
