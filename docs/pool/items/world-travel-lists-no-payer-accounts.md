---
id: world-travel-lists-no-payer-accounts
title: "Travel never lists a payer account, such as the town's retirement-income paying account, as a place to go"
area: world
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude-places-and-names
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Owner, Nov 16, 2026 playtest ("Grano, North Dakota retirement-income paying account" listed in Travel), crew line #9995, stop "Account listed as a place in Travel"
---

**What.** Travel listed "Grano, North Dakota retirement-income paying account" as a place to go. It is a record that moves retirement money, with no building and no staff, and the list showed it as a tile with a picture and a Go button. Seen: owner playing, Nov 16, in Travel. Seen: the Travel screen, the list of places.

**Cause.** Found in code: `townPlaces` in `src/bench/places.ts` walks every organization in town that has a picture. The paying account (`src/core2/data/opening-income.json`, `payer.classification`) gets a stand-in picture from its kind, so in a town with few other workplaces it filled the "biggest workplaces" list.

**Fix.** `townPlaces` skips every payer record, by `PAYER_RECORD_CLASSIFICATIONS` in `src/bench/places.ts`, read from the one data file that names them (`src/core2/data/opening-income-funding.json`). No other list changes.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Wire to the world: the list reads the town's organization records and the one data file that names the payer records. No dice: no roll decides what is listed.

**Done when.** In a drawn place and a seed the builder did not choose, no Travel row is a payer record, and in a town stripped to its player-tied places the account is still not listed, shown in `src/bench/travel-biggest-workplaces.test.ts`; a second session sees Travel in Grano, North Dakota (place key 3832580) with no account tile.

**Waits on.** Nothing.

**Files.** src/bench/places.ts, src/bench/travel-biggest-workplaces.test.ts

**Notes.** The owner's example is one payer record; the rule covers every payer record the funding data names.
