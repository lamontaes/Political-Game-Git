# Notes that were in src/director/data/journal-rows.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

The structure of the My life journal: which moments it writes, which record facts each one reads, and the relation and count words. It holds no sentences; the sentences come from the mined bank (data/english/parts/journal.json) through src/english/mined/journal-bank.ts. A title is only a record name. A moment the mined bank has no sentence for is left out.

## `kinAddress.about`

How two relatives speak of a relative they share, by that relative's relation to both and recorded gender: a brother and sister call their father Dad. A relation with no word here (a shared sibling) is said by first name; a gender with no word, not at all.
