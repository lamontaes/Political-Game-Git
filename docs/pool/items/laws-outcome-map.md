---
id: laws-outcome-map
title: "The outcome map: every law family's effect on the town as a read"
area: laws
kind: wiring
priority: 2
status: open
claimed-by:
pr: #5341
blocked-on: laws-outcome-justice
milestone:
source: "overnight pool item 7"
claimed-at:
---

**What.** Each law family in src/core2/law-reach/ must show its effect on the town as a read: the chain from the law to a named person. A handler whose mechanic is none or records is an unregistered placeholder and must be replaced by a real effect, or registered with the reason it cannot have one. The map picks up where the remaining-families item stops. A player would notice laws that actually change prices, payments or who is served.

**Rules.** The chain is the acceptance: one dollar or rule is followed from the record to a named person and back out to a choice and a journal line. No dice: reach comes from traits, money and the law in force. One rule, all 56 places: checked in a drawn place with place facts in data. Ask why: each person's change cites the source by which they learned of the law.

**Done when.** One chain per law family, in a one-year played world (buildBenchWorld, a drawn place from all 56, seed named): the law record id, the payment or price record id changed, the person record id reached, their choice or view record id, and the director's line, plus the knowing source. The test in src/core2/law-reach-balance.test.ts or a new law-reach chain test covers each family. The owner plays it: pass a law and meet a neighbor it changed.

**Files.** src/core2/law-reach/index.ts, src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts, src/core2/law-reach-balance.test.ts

**Notes.** Picks up where the remaining-families item stops.

Measured Oct 19 (claude, nothing built): the two law reach data files hold 67 policies (41 in group A, 26 in group B). 22 have mechanic `none` or `records`; 17 of the 22 name a stopgap that is open or resolved in `stopgaps.json`, and 5 name none: `minimum-wage` (its effect is real, `laws.ts` raises every job under the floor), the 287(g) partnership and child access prevention (both reach named people and now have outcome-web links to produced outcomes, `crime`/`health.youth-firearm-deaths`), and the sales tax and grocery exemption in group B (their effect is real: `syncSalesTax` in `src/core2/modules/budgets.ts` sets the purchase tax each level collects; the `records` handler writes nothing for them, 0 reaches). So the five unregistered ones are not missing effects; their handler names are stale and misleading. What the item still needs is one chain per family from a law record to a named person's choice and a director line; no law-reach test yet follows a sales-tax or minimum-wage change to a named household's payment or choice. Start from `purchase-tax.test.ts`, which already follows the tax to the treasury.
