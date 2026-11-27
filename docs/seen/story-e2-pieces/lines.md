# Story E2: the pieces, before and after at three drawn places

Run seed `runA`; places drawn from all 56 by `scripts/story/lines-capture.mts` (the same worlds before and after, byte for byte; a place with no adult in a household was passed over: Putnamville, Indiana). Before is the word-helper move (#10686, no change to text); after adds dates, lists, pronouns, capitals, possessives and names. The capture reads the Journal and the person card of up to 300 residents of each place.

What changed in play: a relative the world keeps as a husk showed a record id as a name on the person card (C2); now it shows their name. One list lost its serial comma. The Journal's lines are identical at all three places. A date, a pronoun, a capital or a possessive did not differ in these two views; their before and after are in the unit tests (`src/english/day-words.test.ts`, `move-fit.test.ts`).

## Place 1: Mount Aetna, Maryland (2453750)

Lines read: 22594. Changed: 1080 (1080 a record id replaced by the relative's name, 0 a list).

- `card.ties[3].name` of `person_0a6a8ccdfc127248`
  - Before: `person_c2fc218c0dbd6acc`
  - After: `Donna Patton`
- `card.ties[4].name` of `person_0a6a8ccdfc127248`
  - Before: `person_c69b17c512d406cd`
  - After: `Ezra Patton`
- `card.ties[5].name` of `person_0a6a8ccdfc127248`
  - Before: `person_1c4afdd50346a274`
  - After: `Brian Patton`

## Place 2: Rossville, Indiana (1866150)

Lines read: 31530. Changed: 1126 (1124 a record id replaced by the relative's name, 2 a list).

- `card.ties[0].name` of `person_00a6adc4e301248f`
  - Before: `person_1218f959fe3904ec`
  - After: `Joel Kent`
- `card.ties[1].name` of `person_00a6adc4e301248f`
  - Before: `person_c46d050078993b71`
  - After: `Mina Kent`
- `card.ties[2].name` of `person_00a6adc4e301248f`
  - Before: `person_0e64f7cfb6866fb8`
  - After: `Rowan Kent`
- `card.noJob.text` of `person_895a8fd9fd3676b4`
  - Before: Nobody at home has a job: not you, and not your partner, your sons, or your daughter.
  - After: Nobody at home has a job: not you, and not your partner, your sons or your daughter.
- `card.noJob.text` of `person_895a90d9fd367867`
  - Before: Nobody at home has a job: not you, and not your partner, your sons, or your daughter.
  - After: Nobody at home has a job: not you, and not your partner, your sons or your daughter.

## Place 3: Kaumakani, Hawaii (1530650)

Lines read: 59658. Changed: 2751 (2751 a record id replaced by the relative's name, 0 a list).

- `card.ties[0].name` of `person_005b05b1317d59ba`
  - Before: `person_fd11d16d330aacf7`
  - After: `Ivan Love`
- `card.ties[1].name` of `person_005b05b1317d59ba`
  - Before: `person_978fee2dfad41065`
  - After: `Nancy Love`
- `card.ties[2].name` of `person_005b05b1317d59ba`
  - Before: `person_978feb2dfad40b4c`
  - After: `Joseph Love`
