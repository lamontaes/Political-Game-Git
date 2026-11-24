---
id: credit-bank-mortgages-restated-above-opening-funding
title: "On day one the bank holds about twice the mortgages its opening funded, so its capital reads five times its opening"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "measured by T54 for the Account lead's bank-room question, Nov 15; restatement found by the resident spending thread"
claimed-at:
after:
root: day-one-in-motion
lead: money
model: opus
effort: medium
---

**What.** The day after the world opens, the town bank's books count the mortgages it holds at about twice what its opening says it funded, and the gap reads as capital. Its appetite to lend starts near its ceiling, and every reader of the bank's capital room (business lines, personal loans, `mortgageRoom` for home buyers) reads a bank far richer than it opened. Seen: the bank's book row in dev mode, and how readily it lends in the first year.

**Cause.** Measured: Matagorda, Texas (4847016, the seed `drawPlace("pt1:0", "path-check")` gives), book `book:2025-01-21`: `mortgagesMinor` 167,100,982 ($1.67M, the housing engine's mortgage rows the bank holds, times their weight) against `openingMortgageFundingMinor` 77,513,735 ($775K, from `placeMetadata.housingMortgages`), cash $849K, deposits $637K, equity $1.11M against an opening equity of $212K (`capitalRoom` 5.22). Found in code (the resident spending thread): `restateMortgage` in src/core2/housing-past.ts, called from `housingPast` (src/core2/modules/housing.ts), recomputes each owner's loan from the move record's year after the world is built and sets the contract's amount; at Matagorda `household_b822e058930032f0` goes from a 2019 purchase at 3.75% ($606.50 a month) to a 2024 purchase at 6.94% ($1,258, balance $188,316), and five of five printed changed. `heldMortgages` in src/core2/modules/credit.ts reads the opening from the metadata and today's from the restated rows, so the restatement's difference lands in `equity`. Not yet confirmed that the restatement is the whole gap: the first step is to sum the restated balances against the metadata's for the bank's rows on day 0.

**Fix.** One opening book: the bank's opening funding is read from the same mortgage rows the housing engine keeps after `housingPast`, so the opening and today's balances start equal and only payments, payoffs and new loans move them. Change `heldMortgages` (or where `housingPast` writes) so both come from one record. The player sees a bank whose lending starts where its real capital is.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, write what was read here and stop.

**Rules.** One engine per mechanic; replace, never layer; the books balance; a year stays under two minutes.

**Done when.** A second session builds a world at a drawn place and seed it names and sees, on the first book row, `mortgagesMinor` equal to `openingMortgageFundingMinor` within the payments of the first day and `capitalRoom` within a percent of one, by record id.

**Waits on.** Nothing. The resident spending thread's fix keeping the outside living flow in step with a restated mortgage is separate.

**Files.** src/core2/modules/credit.ts; src/core2/housing-past.ts; src/core2/modules/housing.ts
