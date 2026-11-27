# Notes that were in src/director/data/bring-it-up-rows.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

The structure of bringing up a change: the events a person learns of and the ways they hold someone to blame. It holds no sentences; they come from the mined bank (data/english/parts/bring-it-up.json) through src/english/mined/scene-bank.ts. A change row marked story is a printed story a reader remembers, one fact for each story read whose value is the outlet that printed it: its subject is that outlet and its topic is read from the story record; no one is blamed for it.
