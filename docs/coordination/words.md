# Words: the English engine and the story director

The Words session's status and log, newest first. Only the Words session writes this file. The handoff is `.agents/skills/words-engine/SKILL.md`; the owner's rulings are in `docs/coordination/OWNER-DECISIONS.md`.

- **Owns:** the director (`src/director/`: what happens and why, by record; roles, purpose, stakes, the move at each turn; no words) and the English engine (`src/english/`: how it is said; fills each move from the banks), with `data/english/`, `scripts/english-corpus/`, `scripts/dialogue-batch/` and `docs/grading/`.
- **Three rules that never break:** no words in the director; grade by move; banks are never hand-merged, they are regenerated on top of main.
- **Hand-written lines are held** (owner, Oct 23, confirming AGENTS.md): every authored part is `shippable: false` until the owner grades it good, on main and on every Words branch. The review page and the tests compose held parts through a grading-only option; play never does.
- **Model:** Opus at medium (owner, Oct 15, evening).

## What the owner can play now

- **On main:** talks, the journal, scenes from records, the filing clerk, speeches and the opening, from mined and graded lines.
- **Not yet in play:** scenes where someone wants something from you (a vote, a donation, a comment). They are on the review page, held until graded.

## The line, Oct 23

| Step                                    | PR        | State                                                                                                                                                                    |
| --------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scenes with a purpose (engine part one) | #4459     | Main merged in; the duplicate calibration engine and bench composer resolved; its own 712 authored parts held (536 scene-talk, 176 in other banks); waiting on a merger. |
| The word pack and batches 15 to 21      | #4626     | Rebuilt on #4459: the scene-talk bank regenerated from its generator, all 3,041 parts held. Retargets to main once #4459 merges.                                         |
| The narrative seam                      | #5358     | The director reads no bank: scene-talk piece-picking and the mined adapters move to `src/english/`. Brought onto the new word pack next.                                 |
| The 141 held parts                      | #5647     | Main merged in; the declaration says the 141 are held.                                                                                                                   |
| Batch 22                                | (this PR) | The 141 held parts by move, for the owner to grade.                                                                                                                      |

## Pool-branch PRs that edit Words banks (ruled Oct 23)

- **Closed:** #5601 (superseded by #5600), #5359 (its base closed; it moved a bank composer into the director).
- **Absorbed into the Words line, landing after the seam:** #5600 (speech craft earned by recorded addresses), #5701 (floor and hearing parts, held), #5704 (public-figure sentences; its bank adapter moves to `src/english/mined/`), #5706 (news headlines, held), #5708 (the departure scene reads a move away).

## Next

1. A merger takes #4459; then #4626 retargets to main and #5358 follows.
2. The owner grades batch 22; `apply-grades.ts` folds the grades, and the parts graded good are marked shippable.
3. The next by-move batch: the stack's held parts (scene-talk, conversation, scene-words, journal, address) and #5701's floor and hearing parts.
4. The absorbed PRs, rebuilt on the seam.

## Needs from other sessions

- None open from this line today. Earlier needs (Oct 12 to 15) are in this file's history.

## Questions for the owner

- None open. The stack's authored parts were ruled on Oct 23: hold them all.

## Log

- **Oct 23 (Words session):**
  - #4459 merged with main. One calibration engine and one bench stay (replace, never layer), main's per-profile test is ported, and the conversation bank is merged part by part.
  - Two defects found on a drawn place and a seed nobody chose (Washington Mills, New York, seed e2ddb122b8bfe482) are fixed at the root: a scene ended on the asker's unanswerable question, and a test refused a reunion talk about a school left 44 years ago, which the batch 12 ruling allows.
  - The owner ruled that the stack's authored parts are held, like main's. Each PR holds the parts it adds, so the PRs can land in any order.
  - The seven pool-branch PRs were ruled on, and #4626 was rebuilt on #4459.
  - Next: batch 22, and a merger for #4459.
- Entries before Oct 23 are in this file's git history (`git log -p docs/coordination/words.md`).
