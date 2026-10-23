# Words line status, rewritten Oct 23

Current as of 2026-10-23 (rewritten from the open PR stack; the old Opus-session log is in Git history)

The Words line is the English engine (`src/english/`) and the story director (`src/director/`). How it works and its rulings: `.agents/skills/words-engine/SKILL.md`. Its work is the `words-*` items in the pool; this page only says where the open stack stands.

## The open stack, in merge order

| PR    | Branch                                        | What it is                                                                                   | State on Oct 23                                                                                                        |
| ----- | --------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| #4459 | `words/scene-talk` into main                  | Scenes with a purpose (engine part one), batches 13 and 14                                   | Ready, but handed back Oct 20: merging main conflicts in 11 files and needs a Words-line design call. Merges first.    |
| #4626 | `words/word-pack` into `words/scene-talk`     | The word pack and batches 15 to 21; batch 21 is the newest batch                             | Draft. Regenerated on top of #4459 once it merges (Oct 19 ruling: banks are never hand-merged).                        |
| #5358 | `words/narrative-seam` into `words/word-pack` | The English engine words everything the director stages; the director only says what happens | Draft, handed back Oct 21: conflicts in dialogue-batch, director and English files are the Words session's to resolve. |
| #5647 | `claude/fs11vb-flip` into main                | Every authored part is not shippable until graded (`words-authored-parts-shippable-sweep`)   | Sent back Oct 21: its release declaration says impact none while it disables 141 shippable parts.                      |

## What the owner grades next

Batch 21 (nine scenes from a president's, a governor's and a mayor's played year, 214 new lines) is on the review page of #4626. Batches merge to `docs/grading/` with their branches; the newest batch on main is batch 11.

## Who runs it

The Oct 23 handoff prompt for the next Words session is in the acting CTO's chat. The line runs on the model the owner picks for it (`AGENTS.md`, "Models, effort and helpers"); it may build director producers under the acting CTO's Oct 20 ruling, and every word still comes from the engine's graded or mined bank.
