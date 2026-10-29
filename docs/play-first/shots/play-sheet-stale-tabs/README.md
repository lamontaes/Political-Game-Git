# News with no leftover Politics tabs

Bench 1440×900, Anguilla, Mississippi, seed `9d1490ac-904b-4fa8-83f2-0609986c6166`. Before (main): clicking a Politics tab, closing and opening News in quick succession leaves the Politics tab bar ("Campaigns" highlighted) over the paper. After: no tabs. `node src/bench/sheet-stale-tabs.browser.mjs` fails on main and passes.
