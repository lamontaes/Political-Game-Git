# ALIVE43 ROLE W → LAND and L — increment 1 (W1)

READY FOR RECEIVING REVIEW — VALIDATION PENDING (full `npm run validate` not run).

|           |                                                               |
| --------- | ------------------------------------------------------------- |
| Session   | W, Claude Code `political-game-claude-runtime-proof-77`       |
| Branch    | `claude/alive43-w-world-parties`                              |
| Base      | main `003b45ff365a51665139203a1d4b663ba441c093` (#260 merged) |
| Head      | the commit that adds this file; W1 source commit `b3a22fc7`   |
| Contract  | `alive43-world/v1`                                            |
| Receivers | L (reader/mount), LAND (integration)                          |

## What W1 does

A new life opens into a public national world: every one of 435 House seats
(Census Gazetteer 2025 districts, 50 states) and 100 Senate seats (senate.gov
classes) has a persistent fictional member or a represented vacancy. The
Democratic and Republican parties and four chamber caucuses are organizations;
executives get a public affiliation participation (the Chief Justice none);
each member's publicly listed party and caucus are tags on the public seat-roll
record. Starting variation is an authored bounded setting
(`alive43-contemporary-us-v1`), so no seed fixes one majority. Totals are
derived on every read. Older saves are never enriched and reads write nothing.

## Owned files

- `src/simulation/living-world/` (contract, congress-seats, opening, congress, index)
- `src/presentation/living-world-orientation.ts` (`projectWorldOrientation`)
- `src/presentation/living-world-opening.test.ts`
- `src/simulation/character-history-context-people.test.ts`
- `docs/plans/active/alive43-w-world-and-parties.md`

## Shared-file adapters (declared)

- `src/presentation/opening-life.ts`: `generateOpeningLife` calls
  `ensureLivingWorldOpening` after `establishOpeningOfficeholders`.
- `src/simulation/character-history.ts`: the context-person builder is
  extracted, and `createCharacterHistoryContextPeople` batches it (one
  integrity pass). The single writer behaves identically; a test proves the
  batch equals the single writer, including a repeated key.
- `src/simulation/index.ts`: one appended export.
- `src/presentation/nationwide-opening.test.ts` and
  `nationwide-local-governments.test.ts`: their save-size tests now measure
  `establishOpeningOfficeholders` directly, with **unchanged** 40 KB / 25 KB
  budgets. The Congress snapshot has its own budget (< 1.5 MB, measured
  ~1.33 MB) in the W1 test.

## Checks actually run (on the rebased head b3a22fc7)

- `tsc --noEmit -p .`: exit 0.
- `eslint` on every changed file: exit 0 (on the pre-rebase head; rebase
  touched no W file).
- `vitest run` of 13 files (all `dehardwire-*`, W1 proof, batch adapter,
  opening-life, nationwide-opening, nationwide-local-governments,
  shell-projections, player-pure-surfaces, world39-editorial):
  193 passed, exit 0, 18.9 s.
- Negative control (pre-rebase): with the writer call removed, 7 of 9 W1 tests
  failed on a missing Congress; the file was restored byte-identical.
- Timing probe: opening 107 ms, `projectCongress` 3 ms, orientation 10 ms,
  save 1,380,951 bytes (default setup).

Not run: full `npm run validate`, e2e, corpus regeneration, browser. W1 has no
mounted UI yet; L mounts the orientation reader.

## Remaining limitations

- No state-level partisan geography: seats carry no regional lean.
- Locality holders stay empty until RULES admits local membership.
- A seat whose recorded term ends shows `no-current-record`; no succession
  producer yet.
- Party chapters, organizer encounters (W2) and background developments (W3)
  are not in this increment.

## Receiver action

LAND: receive `claude/alive43-w-world-parties` as a successor of main
`003b45ff` alongside L's mount; re-run the full validate on the union.
