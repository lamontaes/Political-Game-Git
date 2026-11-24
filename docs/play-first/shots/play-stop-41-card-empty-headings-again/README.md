# play-stop-41 again: person card with no empty heading

Bench 1440×900, Anguilla, Mississippi, seed `9d1490ac-904b-4fa8-83f2-0609986c6166`. Before: main, Monica Chang's card shows "WITH YOU" then "LIVES WITH YOU" with nothing beside it, and the People web's selection line reads "Closer this year · · January 20, 2025". After: "Lives with you" is a plain line; the selection line drops the empty part. `node src/bench/card-headings.browser.mjs` opens all 8 people of the circle and finds no empty heading or label (it fails on main for Monica Chang).
