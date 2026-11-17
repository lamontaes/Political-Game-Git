# Scene samples: the owner's click-through Scenes page

One JSON file per scene type, written from a played world by `scripts/words/scene-samples.ts`, never by hand. The owner plays them on the click-through page the CTO publishes (owner, Nov 13, 2026: "they essentially let me click through the conversation and choose my own dialogue and see the replies, and then I could go back to the beginning"), and his voice notes come back to the Story thread (#9750) verbatim. His grades reach every part of the engine a line touches, not only the scene he graded (owner, Nov 14).

## Make or refresh a batch

```
node --max-old-space-size=6144 --import tsx scripts/words/scene-samples.ts --seed <word> --days 240 --as resident
node --max-old-space-size=6144 --import tsx scripts/words/scene-samples.ts --seed <word> --days 240 --as legislator
node --max-old-space-size=6144 --import tsx scripts/words/scene-samples.ts --seed <word> --days 240 --as mayor
```

The place is drawn from all 56 by the seed. Every scene the director stages for the player with a purpose is written as `<typeKey>.json`; the newest sample of a type replaces the older one, so the page is kept current and no old copy is kept. `INDEX.json` lists every sample with its place, seed, day, the player's standing and how many paths reach each ending. A run as a resident meets the scenes of a life not in office; the seated runs meet the office's own.

## What a sample holds (`scene-sample/1`)

- `scene`: the type key, its purpose and variant family, and a title.
- `world`: the place, its key, the seed and the day; `player`: who you are and what you hold; `cause`: the record id and label the scene was staged from; `cast`: the asker and the asked.
- `opening`: the narration, the other person's opening and any line your character says before the ask, in order.
- `ask`: the line that states what the scene is about.
- `tree`: the exchange. A node holds `lines` (what the other person says), `replies` (each a line marked as yours with `leadsTo`, the node it opens, or `null` when the scene ends there), `branches` after a lie (both outcomes), and `end` (the outcome, the named ending and what the world keeps, and the closing line).
- Every line carries the bank pieces it was said from and `wordings`: the other wordings the English engine tied with the one said, as the bank words them (slots in braces), so the owner can grade wordings as he did on the earlier pages.
- `endings` counts how many paths reach each named ending; `depth` is the most player turns on one path; `gaps` lists spots the bank had no piece for.

A reply the page shows is one the game offers; a line here is one the game said at that place and seed. The page is a view of the same records as play (owner, Oct 28).
