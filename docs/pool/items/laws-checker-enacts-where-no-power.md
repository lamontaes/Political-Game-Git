---
id: laws-checker-enacts-where-no-power
title: "The law-wiring checker enacts a state law at the city level when the bill catalog offers it there"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The checker enacts a law at the lowest level the bill catalog lists for it (`scripts/law-wiring/check.ts`, `townLevel` with `law.catalog?.levels`). For 31 of the catalog's 59 policy questions the catalog lists the city, while `src/core2/data/legislature/series-powers.json` grants only the state or federal government the power (for example restore voting after a sentence, Medicaid expansion and the bottle deposit). In a subject-presence draw for restore voting (Rinard, Iowa, seed 7a3535a49386981d, Oct 24) the checker enacted the law at the city, where its reach handler finds no one to restore, so the run graded reach as missing although the state-level law reaches people in the audit towns.

**Rules.** One rule, all 56 places: the checker enacts a law where a government in that place holds the power to enact it, read from the same series powers the legislature's authority check reads, never a hand list.

**Done when.** `scripts/law-wiring/check.ts` picks the enacting level from the series powers (and the town's home-rule authority where it grants a local power), and a rerun of restore voting in Rinard, Iowa (seed 7a3535a49386981d) in a played world (`buildBenchWorld`) enacts it at the state and names the reach records it writes. The families whose laws changed level are listed for regrading. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/law-wiring/check.ts, src/core2/data/legislature/series-powers.json, src/core2/data/legislature/bill-catalog.json

**Notes.** From the laws lead, Oct 24, reading the restore-voting draw's run file.
