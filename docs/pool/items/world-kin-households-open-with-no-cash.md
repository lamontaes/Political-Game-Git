---
id: world-kin-households-open-with-no-cash
title: "The family's relatives placed around the county open with no cash at all: about 21,000 counted people at Bastrop, Louisiana, most of them working, hold $0 on day one"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-counted-renters-buy
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: Account lead T54 2026-11-14
source: Account lead T54, measuring counted groups' savings for world-counted-renters-buy (#9117), Nov 14, 2026
---

**What.** Every relative the opening places around the played town (the player's and the town's kin, counted households in the county's other places) opens with no money, while it is charged a daily living cost. Many of its adults work and draw pay from the first month. Seen: their groups' accounts read $0 on the first day, so anything that reads a counted household's cash (whether it looks for work, can pay a bill, can buy a home, what a filled-in relative carries when the player meets them) reads nothing for these households until their pay builds it.

**Cause.** Found in code: `buildPopulation` (src/core2/population.ts, about line 1967) writes `liquidMinor: p("zero")` for every relative (`relatives` from `kin.people`), with `livingCostDailyMinor` from `kinLiving`; the town's own households and the county sample get `medianTransactionBalance` by their pay (population.ts about line 1414, opening-county-sample.ts about line 289). Measured: at Bastrop, Louisiana (place 2204685, `drawPlace("c3", "home-price-paths")`, world seed 452a3c32cb1dec08db7647f6288fecab595bf56002a3112926e035d4f043a7c0), the day after the opening 43 counted groups with people hold nothing: 10 are group quarters (the jail and the nursing home, 285 people, rightly cashless), and 33 are relatives' groups of tenure "other", about 21,000 people, about 18,000 of them in one county place (jurisdiction_1d1fb29e9cc5bdb4, whose residents account opens at $0) and about 1,900 in another (jurisdiction_d23f2882a913b937). All counted groups together held $265 a person on day one and $3,468 after twelve months, so the groups save; these open with nothing to start from.

**Fix.** Give each relatives' household its opening cash through the one path the town uses: `medianTransactionBalance(annual pay, seed, head's age)` shared among its adults, as population.ts does for the town. A relative has no recorded wage; read its household's pay from the job share the opening gives it (the same pay its group's income reads in `householdIncome` once play starts: its workers times its place's pay per worker), or, where it has no worker, `householdDailyCost × moneyBufferDays` as the town's no-worker households get. Fund it from the place's residents account like the rest (`fundGroups`), so the books balance.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One model, two tiers. Estimate, never zero: the opening's cash is the survey's median for the household's pay and age (data/research/money/scf-transaction-accounts-2022.json). The relatives' cash changes every opening world: year 1 and time per record at three drawn places with and without, by speed's rule.

**Done when.** At Bastrop, Louisiana (place 2204685, seed c3) a pinned test shows the day-one relatives' groups holding the summed medians of their households (none at zero but group quarters), and a second session runs a played world at a drawn place nobody chose, names its seed, and sees the relatives' group accounts open with cash, by group id, with year 1 and time per record at three places in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/population.ts, src/core2/starting-cash.ts

**Notes.**
