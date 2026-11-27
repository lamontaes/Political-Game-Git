# Notes that were in src/director/data/local-address.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

A governor's and a mayor's yearly address (owner, Nov 8: 'the address... governors' and mayors' too'). Each level names the occasion in the English engine's bank (`state-of-the-state`, `town-address`), the office whose holder speaks, the policy level they may act at, and the day of the year it is given. The words, the kind of address and the subjects come from the same places the President's do (src/director/speech-outline.ts and its rows in speech-outlines.json, address-kind.ts, the term read); this holds no sentence.

## `levels.town.heads.about`

Who gives the local address: the place's nearest government that seats anyone (`order`: a city or town first, then a township, then the county), and in it the office the records seat as its head (a mayor or an elected county executive, the local heads in src/core2/data/offices/executives.json, said by the office row's own title), else the presiding member of its governing body (`bodies`: the council president, the board's chair, read from the leadership engine). TUNABLE order, checked against who gives a State of the City or a county's State of the County (Ginther 2024; county executives and board chairs give the county's).

## `heard.about`

How a governor's or a town head's address reaches a player at home (the one staging rule for a broadcast heard; the newscast could use it too): the narrator names the first of the place's own outlets in `order` that the press records keep, and the occasion as people say it by the address's kind. The President's address plays as its montage instead (src/bench/data/opening-montage.json). TUNABLE order, checked against how people follow a State of the State (most watch or hear it live; the paper prints it the next morning).
