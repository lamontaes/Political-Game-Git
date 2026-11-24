---
id: laws-checker-enacts-where-no-power
title: "The law-wiring checker enacts a state law at the city level when the bill catalog offers it there"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/checker-power-level
pr: #6331
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T14:12:46.100Z
---

**What.** The checker enacts a law at the lowest level the bill catalog lists for it (`scripts/law-wiring/check.ts`, `townLevel` with `law.catalog?.levels`). For 31 of the catalog's 59 policy questions the catalog lists the city, while `src/core2/data/legislature/series-powers.json` grants only the state or federal government the power (for example restore voting after a sentence, Medicaid expansion and the bottle deposit). In a subject-presence draw for restore voting (Rinard, Iowa, seed 7a3535a49386981d, Oct 24) the checker enacted the law at the city, where its reach handler finds no one to restore, so the run graded reach as missing although the state-level law reaches people in the audit towns.

**Rules.** One rule, all 56 places: the checker enacts a law where a government in that place holds the power to enact it, read from the same series powers the legislature's authority check reads, never a hand list.

**Done when.** `scripts/law-wiring/check.ts` picks the enacting level from the series powers (and the town's home-rule authority where it grants a local power), and a rerun of restore voting in Rinard, Iowa (seed 7a3535a49386981d) in a played world (`buildBenchWorld`) enacts it at the state and names the reach records it writes. The families whose laws changed level are listed for regrading. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** scripts/law-wiring/check.ts, src/core2/data/legislature/series-powers.json, src/core2/data/legislature/bill-catalog.json

**Notes.** From the laws lead, Oct 24, reading the restore-voting draw's run file.

Worker note (Claude, Oct 27): fixed in `scripts/law-wiring/check.ts` (`enactingLevels`: the catalog's levels narrowed by `src/core2/data/legislature/series-powers.json`, the same table `beyondPower` reads). 32 laws now enact at the state, not the city: infrastructure (mileage fee replaces fuel tax, shift highway funds to transit); healthcare (expand Medicaid eligibility, Medicaid work requirement); education (public funds for private schooling, raise teacher minimum salary); taxes-finance (adopt income tax, cap property tax growth, graduated income tax); labor (local minimum wage authority, right to work); business (cap consumer loan rates); energy-environment (clean electricity standard, clean air plan for polluted counties, bottle deposit, price carbon); justice (end cash bail, restore voting after a sentence, raise juvenile court age, child access prevention, permit to carry concealed, raise handgun purchase age, stand your ground); government (all-mail voting, automatic voter registration, photo ID to vote, same-day registration, broaden local authority); rights (restrict abortion); technology (age verification for social media, consumer data privacy law); and starting law unemployment-insurance. Those families' matrix rows need regrading.
