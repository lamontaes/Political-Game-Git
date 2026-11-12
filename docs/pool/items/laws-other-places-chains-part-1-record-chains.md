---
id: laws-other-places-chains-part-1-record-chains
title: "Each other place's law chain is recorded in the laws module, so a worker's residence law is read from records"
area: laws
kind: feature
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: design-country-tier
source: split from laws-other-places-chains in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A worker who lives outside the played town is withheld by the law of their residence, but that law comes from a static starting-law lookup, not from recorded rows, because only the town's own chain is recorded as a world (stopgap SG-WORLD-withholding-residence-law). Record each residence's chain (federal, state, county, place) and its starting law rows in the laws module, which already takes an enacting jurisdiction on every row, and have withholding read them. This is part 1 of laws-other-places-chains.

**Cause.** Found in code: the stopgap's reason is out of date. SG-WORLD-withholding-residence-law (src/core2/data/stopgaps/world.json, written Oct 14) says an act enacted in a jurisdiction the town does not share is never read, because enacted laws were recorded only for the town's chain. Since then `outsideEnact` in src/core2/modules/world-legislating.ts (line 1486) enacts another state's act with `enactLaw`, as a row in the laws table under that state's jurisdiction, and `stateLawInForce` in src/core2/modules/laws.ts (line 639) reads any state's law that way for the country tier, outside budgets, counted moves and climate. `residentLaw` in src/core2/modules/budgets.ts (line 1721) already hands every recorded row of the series (`bySeriesOnly`) to `resolveLawInForce` with the residence's own chain, plus the residence's starting rows from the research (`residenceLawFor`, line 1698). So an act enacted elsewhere should already change a resident's withholding. What is left: nobody has proved it, the two stopgap calls still fire on every read, and a residence the place lookup cannot resolve gets federal law only (the `!own` branch). Read on main Nov 10; not run.

**Fix.** Add no table: a chains table would store a second copy of what the research and the laws table already give. First write the test: in a played world, a worker who lives in another state, an act enacted there in play (through `outsideEnact`), and that worker's withholding on a payday before and after the act's effective date, by law row id and payroll record id. If it passes, the reader is right and the item is the proof. If it fails, name where `resolveLawInForce` drops the act and fix it there. Then count in a played year how many paid workers reach the `!own` branch and give them their state's law through `stateLawInForce` when only the place is unknown. Keep `residenceLawFor` as the reader of a residence's county and place starting rows; it is a cache, not a record.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a worker's paycheck is followed from the recorded law row to the amount withheld and the treasury that received it, by record id. An effect is a read, not a record: withholding must read the recorded rows. One rule, all 56 places: no place or state is named in logic. Replace, never layer: the static residence map goes in the same change. No dice: tax follows the law in force and where the worker lives.

**Done when.** A second session, not the builder, runs a one-year played world (buildBenchWorld) in a place drawn from all 56 on a seed nobody chose (both named) and sees: a worker who lives in another state is withheld by that state's law in force; after an act enacted there in play takes effect, the worker's withholding changes on the next payday, by law row id, payroll record id and the treasury journal entry; and the journal balances. A test in src/core2 holds it, and the count of workers whose residence cannot be resolved is in the pull request.

**Waits on.** Nothing.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/tax-withholding.test.ts, src/core2/data/stopgaps/world.json

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have withheld a commuter's pay by the law of the place he lives in; the player would see one commuter's paycheck differ by a little.
