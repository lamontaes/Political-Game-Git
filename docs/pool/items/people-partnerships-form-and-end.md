---
id: people-partnerships-form-and-end
title: "Households change only by births, deaths and moves: no one partners, separates or leaves their parents' home in a played year"
area: people
kind: feature
priority: 2
size: L
status: dropped
claimed-by: claude/partnerships
pr: #5189
blocked-on: people-partnerships-full-people-form
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:09:20.815Z
---

**What.** A played year in Epping, New Hampshire (seed bf16c3219c00, 2,001 full people and about 12,700 counted, bench world with every module installed, Oct 17) writes 22,453 acts and a few hundred cause, news and office events, and no event of anyone partnering, marrying, separating, divorcing or leaving their parents' home. Households change only by a birth, a death, a move or a household leaving the counts (`opening-partnership.ts` sets partnerships once, at the opening). Real towns turn over roughly six marriages and two to three divorces per thousand residents a year (CDC NCHS marriage and divorce rates; ACS marital events in the last year, table B12503 and B13010), and young adults leave their parents' homes in their twenties (ACS B09021). Over a few years the town's household mix and the player's own circle stop looking like a town's.

**Rules.** No dice: a partnership forms or ends from the people's ages, closeness, traits, money and housing, and from the law in force (marriage and divorce law by state), never a fixed percentage; real rates check totals only. One model, two tiers: counted people partner and separate by the same rule as full people, times their count, and a full person filled in is the same household member. Wire to the world: a new household moves a dwelling, a lease or a mortgage, and its money, by journal record. This is a game, not a spreadsheet: no new player step; the player sees it as people's lives and the director's scenes (proposal, breakup, moving out). No hand-written player text. Estimate, never UNKNOWN.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), partnerships formed and ended and young adults leaving home appear as records by id, their totals per thousand residents fall within the spread of the CDC and ACS rates, and a named couple is traced from closeness to the new household's lease and journal. A test in src/core2 names the place and seed.

**Files.** src/core2/modules/people.ts, src/core2/opening-partnership.ts, src/core2/modules/housing.ts, src/core2/data/people/

**Notes.** Found Oct 17 while auditing a played year's totals against real rates: births match their tables; deaths and moves were fixed (the pool items core-counted-deaths-opening-illness-nan and core-counted-moves-town-groups-never-leave); this is what the year is still missing. Read `docs/coordination/DECISION-REGISTER.md` and `OWNER-DECISIONS.md` first for any ruling on how partnerships are shown.
