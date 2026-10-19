# M1-officials: every office, its seats, and the people in them

**Contract:** M1-12 and M2-01, built together in M1 (owner, Oct 10). M1-12: click any official in any state and see a full record with personality, history, relationships and the positions behind their votes. M2-01: in a random place, every seat that covers the player has a holder with a record and a term, and a vacancy is filled the way that office's real rules say.

**Builder:** a new Codex session, CODEX-OFFICIALS, at **medium**: people builders and views already exist, and this work order puts people in seats from researched structures.
**Finisher:** a new Claude session, **Opus at high** (owner, Oct 10: M1-12).
**Branch:** `pool/M1-officials`, stacked on `pool/M1-views`. **Starts:** when M1-views' tables and opening are on its branch.
**Owns:** `src/core2/modules/offices.ts`, `src/core2/offices-*.ts`, `src/core2/officials-*.ts`, `src/core2/data/offices/`, `data/research/offices/`, and their tests. Read `M1-common.md` first.

## Why one work order

An official's record needs a seat, and a seat needs a holder. Built separately, the seat table and the people in it would have two writers. Building them together in M1 also gives M2's elections and M3's legislatures and executives a complete roster to start from.

## What exists

- **Old core:** 535 fictional members of Congress at the opening (`src/simulation/living-world/opening.ts`, `congress-seats.ts`); a person in every state legislative seat (`src/simulation/nationwide-world/state-legislature-opening.ts`, chamber sizes from rule packs or Census district counts, party counts from the Book of the States); governors (`nationwide-world/state-executives.ts`), presidents (`presidential-turnover.ts`); histories from `src/simulation/character-history.ts`; positions filled in lazily by `governing/officeholder-principles.ts`, so a record exists only if something asked for it.
- **Lifted rules** (`src/rules/offices` on `pool/P14-offices`): seat terms, filing openings, qualification profiles, congressional seat terms, district lookups.
- **New core:** nothing. M0's tables and calendar are where seats and terms go.
- **Data:** `data/research/apportionment/apportionment-2020.json`, `house-delegates-2024.json`, `data/source/state-legislatures` (known structure for only 14 of 50 states), federal court seat counts. `data/research/laws/legislators-2023.json` comes from the Book of the States, whose terms forbid commercial use: don't read it; replace it.
- **Real names:** names are drawn with no check against real current officeholders, and the legal review (PR #3947) found 66 possible full-name matches.

## Research first

1. **Every office's structure, all 56 places,** from state constitutions, statutes and the legislatures' and secretaries of state's own sites: chamber sizes, district counts, term lengths, term limits, staggering, statewide executive offices, and how each kind of vacancy is filled (appointment by whom, special election, or a successor in line). Answer `docs/research/requests/state-legislature-chamber-sizes-and-quorum.json`, `legislature-packs-for-every-unbuilt-jurisdiction.json` and `island-territory-legislatures-and-local-offices.json`.
2. **County and city offices** for a representative sample of each kind in every state (commission or council size, mayor or manager, elected clerk, sheriff, prosecutor, assessor), from charters and state law, then estimates for the rest.
3. **Who officials are:** age, tenure, prior jobs and paths to office by level (answer `state-legislator-age-tenure-and-district-lean.json`), from public rosters in aggregate. Collect aggregates only, never names.
4. **A list of real current officeholders' names, for checking only:** used by a test that fails if a generated official's full name matches one. The list never ships in the game bundle.

## Build

1. **Tables.** Register module `offices`: offices (level, place, kind, powers reference), seats (district, term pattern, term limit), terms (holder, start, end, how they got there), and vacancies with their fill rule. Index by place, by level and by holder.
2. **Every seat from day one:** federal (president, vice president, Congress, cabinet heads, federal judges by seat count), every state (governor, statewide offices, both chambers), and for the player's state every county, city and school board seat. Other states' local seats are created the first time anything looks at them, deterministically from the world seed, so they are the same every time and cost nothing until used.
3. **Holders are full core2 people:** personality, kin and a past through OPUS-PEOPLE's builders, career paths from the research, and values and stances from M1-views. Their records list how they reached the seat (an election result or an appointment), as a placeholder history until M1-history and M2's elections write real ones.
4. **Positions behind votes** are the holder's own stances from M1-views, recorded with their reasons; there's no lazy fill-in.
5. **Terms and vacancies:** term ends go on the module calendar. A vacancy from death (health), resignation or removal is filled by that office's real rule: appointments now, through the appointing official's choice with reasons; special elections when M2's elections land, as a registered stopgap until then.
6. **No real names:** the generation path checks every official's full name against the checking list and redraws the name only (who exists may be seeded). The test fails on any match.
7. **Bench:** click any official in any state for the full record; the player's seats with their holders and terms.

## Speed and memory

Officials outside the player's focus run at the coarse tier. Measure the opening's size and time with the full roster against the size budget, and report both.

## Out of scope

Elections and campaigns (M2), what officials do in office (M3), courts' judges' work (courts), and party organizations (M2-08).

## Hand-off

The finisher clicks officials in three random states (a legislator, a governor, a member of Congress, and a county officer in the player's state) for full records with positions and reasons; checks one vacancy filled by its real rule; and runs the real-name test.
