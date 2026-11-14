---
id: history-housing-before-start
title: "Housing has a simulated past: leases, rents and home values before day one, so Metrics shows last year's rent and home value on the first day"
area: world
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-l20ff2
pr: #9084
after:
blocked-on:
lead: money
model: opus
effort: medium
root: design-one-model-two-tiers
checked: Account lead 2026-11-14
source: owner in chat Nov 13 2026 23:51Z ("it's simulated... things need to be simulated in order to make your modern day make sense"); OWNER-DECISIONS Oct 27 ("History is simulated before the start date, no hotfix") and Oct 28 (history from the player's birth year, coarse, general)
---

**What.** Eight modules run a coarse history before the start; housing opened as a snapshot on the start date. No lease, rent or home value existed before day one, every opening lease was stamped as renewed 0 to 11 months ago by a hash of its id, and Metrics showed no housing rows at all on day one (no year row until the first month step), let alone last year. Seen: Metrics on day one, the town's typical monthly rent and typical home value each with last year beside them; in dev mode the year row names the pass's `housing.town-figures` record.

**Cause.** Design: owner's ruling in chat, Nov 13, 2026 23:51Z, and docs/coordination/OWNER-DECISIONS.md (Oct 27, history simulated before the start). Housing's pre-start run (src/core2/modules/housing.ts) only called `openHousing`; `openingAnniversary` (src/core2/housing-occupancy.ts) stamped renewals by hash; nothing wrote a year row for the years before the start (src/core2/output-numbers.ts).

**Fix.** src/core2/housing-past.ts runs in housing's government-phase run after `openHousing`. Each household's tenancy begins on one date (a full household's latest move record; a counted renter's years in place; a counted owner's ACS B25038 purchase year), written as `housing.lease-signed` or `housing.home-bought` and set as the household's and dwelling's `since`. Rents run forward under the renewal rule's pay ratio from the economy pass's months, the market level set once per place so day one's median paid rent is the opening's sourced median; home values follow `homePriceRatio`. A full owner's mortgage is restated from the year its move says it bought (`mortgageFrom`, the opening's one formula). Each place's typical rent and home value at every step, each December and the last day are `housing.town-figures` rows, put into the registry's year rows by `putPastYear`. `openingAnniversary` is deleted.

**Time box.** 6 hours for one Opus session at medium effort.

**Rules.** History is simulated before the start, by the engines (owner, Oct 27, Oct 28, Nov 13). Real data calibrates and is never the figure shown. One past per household. Speed: no added work in the played year; open time measured at three drawn places.

**Done when.** A second session starts a new life in a drawn place on the train, naming place and seed, opens Metrics on day one and sees last year beside typical rent and typical home value; in dev mode's Trace the year row's input names a `housing.town-figures` record dated December 1 of last year; a lease's first renewal in play falls on the month its `housing.lease-signed` record was signed.

**Waits on.** Nothing.

**Files.** src/core2/housing-past.ts, src/core2/modules/housing.ts, src/core2/housing-occupancy.ts, src/core2/housing-mortgages.ts, src/core2/output-numbers.ts

**Notes.** Built by Account lead T45 on the train. Supersedes draft PR #8991 (sourced last year), rejected as a hotfix by the Account lead under the Oct 27 ruling.
