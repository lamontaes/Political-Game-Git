---
id: core-player-household-no-income
title: "A player household with no earner spends its cash in one month and then nothing moves (Colebrook, New Hampshire)"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: found by a Claude session verifying core-player-money-spending in a played year
---

**What.** In Colebrook, New Hampshire (place 3313700, seed cfa61ad11b9653ed75640a7ae2762a424b830ac48efd67c06f0e19580d907725, from January 20, 2025) the player's household has no earner and no benefit. It starts with $1,820, pays rent (journal record `finance:2025-02-01:lease:household_8751b07b98417c96`), living costs (`living:household_8751b07b98417c96:2025-02-01:organization_06f5db326dc368db:0`), outside living (`residents:outside-living:household_8751b07b98417c96@2025-02-01`) and a small electricity price share, and its cash is $0 from the first month. No journal entry touches its accounts for the rest of the year: no pay, no benefit, no loan, no arrears record I could see. Decide what the world should do for a household with no earner (jobs offers, a benefit the law in force pays, family help, a loan from a bank that reads their record) and make the chain run, or show why none applies.

**Rules.** No dice; an effect is a read; the chain is the acceptance; one rule, all 56 places; this game has no spreadsheet steps, so the answer comes from people, money and places reacting, not a new form. Check docs/coordination/OWNER-DECISIONS.md ("Why money exists for the player: not settled yet") before adding any sink or scoreboard.

**Done when.** In a played year of that place and seed, the household's money has a recorded cause for each month after the cash runs out (income, a benefit, a loan, or unpaid bills with their consequence), by journal record id.

**Files.** src/core2 money and household files (jobs offers, benefits, finance contracts).

**Notes.** Found while verifying core-player-money-spending; a household with an earner behaves (see player-money-year.test.ts). I did not check arrears, eviction or the Jobs offers for this household.
