---
name: story
description: >
  How Story works, the one engine for the English engine, the director, scenes
  and words (owner, Nov 26: "It's all just going to be called story now"): the
  layers (situations, moves, pieces), the owner's rulings on words, wiring a
  scene's cause to a record, giving a scene its picture, and the press desk's
  reach. Use when working on player text, banks, scenes, conversations, the
  Journal, speeches, grades or rules, when a scene waits on a producer, or when
  a story kind never prints. Not for writing lines (story-writer), judging them
  (story-check) or timing a year (speed-work).
---

# Story, the one engine

Story is the director (`src/director`), the English engine (`src/english`) and their data (`data/english`, `src/director/data`): one family in `tests/guards/families.json`. The simulation knows; Story says it. Every screen, scene, Journal line, story in the news and speech is a view of the same records.

**Look first:** run the `look-first` search before building, fixing, filing or asking.

## Parts

Read the part for the job. Each is a whole skill kept as it was, so every owner quote and rule is in it.

| Job                                                                                                                                                                | Read                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| How the engine, the director and the banks work; the owner's rulings on words; rules that pull lines; speeches from the one planner; reading a term by policy area | `references/words-engine.md` (its own files under `references/words-engine/`) |
| A situation type waits on a producer, never fires in a played year, or one kind needs several arcs                                                                 | `references/scene-producers.md`                                               |
| Giving a scene or scene type its picture (`situationPlaces`), the gap report, wanted pictures                                                                      | `references/scene-pictures.md`                                                |
| Which stories a town's outlets print and how a record's reach is weighed                                                                                           | `references/press-desk-reach.md`                                              |

## Boundaries

- Writing or deleting lines is `story-writer`; grading, the words stamp and the scene standard are `story-check`.
- The `lives` skill (people outside the town) belongs to the people engine, not Story.
- Screens' strings are `player-screen-text`.
