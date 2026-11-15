---
id: history-economy-past-is-this-worlds
title: "The economy's past before day one is this world's own: every month the macro pre-start pass records carries the world's offsets, not the published figures unshifted"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-wuv4fd
pr: #9089
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: Account lead 2026-11-14
source: owner in chat Nov 13 2026 23:51Z (the past is simulated; real data calibrates); Account lead T45's finding on #9084
---

**What.** The economy's months before the start are the published BLS and Fed figures copied unshifted, so every pass that reads them (housing's rents, the moves pass's pull month, the work pass) runs on the real country's past, not this world's. The world already has its own offsets for the months just before the opening, but they reach back only to the latest full-data year. Seen: Metrics on day one, last year's typical rent (housing's rents move with this pay) and the nation's rows, which then agree with the world's own opening months.

**Cause.** Found in code: the macro pre-start pass (src/core2/modules/macro.ts:977, `preStart.run`) records `publishedMonth(month)` (src/core2/macro-model.ts:504) for each coarse step, unshifted, tagged SOURCED. The world's offsets (`macroWorldOffsets`, src/core2/macro-model.ts:216) are applied only by `historyMonths` (src/core2/macro-model.ts:251), and that function covers only `publishedMonths` (src/core2/macro-model.ts:109): the months since the latest full-data year. Housing's pre-start pass on #9084 reads `economy.conditions` hourly earnings (its `paySeries`).

**Fix.** In the macro pre-start pass, move each recorded month by the world's offsets the way `historyMonths` does: rate offsets alike every month, growth offsets compounded from the opening month back, so a recorded month and `historyMonths` agree wherever both exist. Tag the rows ESTIMATED with the published series as the calibration source. Delete any second copy of the offset arithmetic: one function moves a published month into this world, and both callers use it.

**Time box.** 3 hours for one Sonnet session.

**Rules.** History is simulated before the start (owner, Oct 27, Oct 28, Nov 13): real data sets the base and shape of this world's past and is never the figure shown. One engine per mechanic (owner, Oct 27): the macro engine owns the economy's months, and every pass reads its rows rather than the published table. Speed: the pass runs once at the opening, so a played year must not change.

**Done when.** A second session starts a new life in a drawn place on the train, naming place and seed, and sees the nation's rows and last year's typical rent on Metrics on day one read from this world's months. In that played world, at a drawn place (name the place and seed), every `economy.conditions` row before the start equals `historyMonths`' month where both exist, and differs from the published month by the world's offsets elsewhere. `housing-past.test.ts` still passes, and Metrics on day one shows last year's rent read from pay on the world's own path.

**Waits on.** Nothing.

**Files.** src/core2/modules/macro.ts, src/core2/macro-model.ts; housing's pre-start pass on #9084 reads only

**Notes.** Filed by Account lead T45 from #9084: pay before the start was the published months unshifted, and the Account lead asked that it be built, not only filed. Built by Account lead T48 on claude/project-thread-wuv4fd (the same item file as #9084's; whichever folds second keeps this status). The plan's open choice was ruled by the Account lead on Nov 14: growth offsets compound over the whole window, one rule with `historyMonths`. Known unshifted reader left for the home-price work: src/core2/housing-mortgages.ts `historicalMortgageRate` (published mortgage rates for past purchases).
