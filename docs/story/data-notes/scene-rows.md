# Notes that were in src/director/data/scene-rows.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

The structure of scene narration: the setting kinds, the cause label prefixes and the word that joins several names. It holds no sentences; they come from the bank (data/english/parts/scene-words.json) through src/english/mined/scene-bank.ts. A setting or cause the bank has no sentence for is left out. The narrator opens a scene with one short paragraph: how the scene reaches the player when it is a call or a letter (never the day, the place or who is there: the screen shows them; owner, Oct 26 and Oct 27), what is happening, by the staged situation type, what led here, and how the scene opens (its first role's move, narrated by the bank's opening sentences).
