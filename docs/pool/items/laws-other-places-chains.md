---
id: laws-other-places-chains
title: "Other places' law chains are recorded as worlds, so a worker's residence law and a neighbor town's enacted acts are read"
area: laws
kind: feature
priority: 3
size: L
status: dropped
standard: 2
claimed-by:
pr:
blocked-on: laws-other-places-chains-part-1-record-chains, laws-other-places-chains-part-2-enacted-acts, laws-other-places-chains-part-3-close-stopgap
after:
source: added with npm run pool -- add
claimed-at:
lead: laws-effects
model: sonnet
effort: low
root: design-country-tier
checked: fable 2026-11-10
---

**What.** Only the played town's law chain is recorded as a world, so a worker who lives in another place is withheld by a static starting-law lookup and a law enacted in a jurisdiction the town does not share is never read (stopgap SG-WORLD-withholding-residence-law). This is the roll-up for recording other places' chains: part 1 records each residence's chain and starting rows, part 2 writes acts enacted elsewhere to the same table, part 3 closes the stopgap. It closes by checking one worker's paycheck end to end. It also takes over gov-standin-withholding-residence, which names the same stopgap row.

**Cause.** Design: docs/design/country-tier.md ("Income and payroll taxes are withheld by the law in force in that state and the nation, with the same function a town paycheck uses") and stopgap SG-WORLD-withholding-residence-law in src/core2/data/stopgaps/world.json.

**Fix.** Build part 1 and then part 3; this item adds no code of its own. Part 2 is a proposed drop: acts enacted in other states are already rows in the laws table. After part 3, check one worker's paycheck from the law row to the treasury that received the tax.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: one enacted law is followed to a named worker's paycheck and the treasury that received it. An effect is a read: withholding must read the recorded rows. One rule, all 56 places: no place or state is named in logic. Replace, never layer: the static residence map and the stopgap are gone. No dice: tax follows the law in force and where the worker lives.

**Done when.** A second session, not the builder, replays on main in the running game: in a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 on a seed nobody chose (both named), a worker living outside the town has withholding that follows their residence's recorded law, including one act enacted in play, by law row id and payroll record id; src/core2/tax-withholding.test.ts and src/core2/withholding-outside-governments.test.ts pass.

**Waits on.** laws-other-places-chains-part-1-record-chains and laws-other-places-chains-part-3-close-stopgap.

**Files.** src/core2/modules/laws.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps/world.json, src/core2/tax-withholding.test.ts, src/core2/modules/world-legislating.ts, src/core2/withholding-outside-governments.test.ts

**Notes.** Oct 20 (pool feeder): spec written; L item split into two; the laws module already takes an enacting jurisdiction on every row, so no schema change is needed beyond a chains table.

Folded in Oct 25 from laws-other-places-chains-record. Its done when: In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), a worker who lives in another state has a recorded chain row and recorded starting law rows, their withholding on a named payday equals the recorded rows' income-tax answer, and the journal balances; a test in src/core2/tax-withholding.test.ts names the chain row, the law row and the payroll record by id.

Folded in Oct 25 from laws-other-places-chains-enacted. Its done when: In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), a law enacted in a jurisdiction the town does not share changes the withholding of a named worker who lives there from its effective date, with the law row id, the payroll record id and the treasury journal entry named, and SG-WORLD-withholding-residence-law is marked resolved in stopgaps.json with its replacement reader named and its ID retained; src/core2/withholding-outside-governments.test.ts proves it.

**Notes (pool redo, Nov 10).** Split into the three parts named in Waits on. gov-standin-withholding-residence covers the same stopgap row; the CTO is asked to fold it into part 1.

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have withheld a commuter's pay by the law of the place he lives in; the player would see one commuter's paycheck differ by a little.
