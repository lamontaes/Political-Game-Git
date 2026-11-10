---
id: core-country-tier-town-joins-its-state-part-3-a-sellers-share-follows-its-books
title: "The town joins its state, part 3: a seller gains or loses outside customers by its own price and capacity against its sector"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: high
root: design-country-tier
source: split from core-country-tier-town-joins-its-state by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
---

**What.** Outside buyers are divided among a town's sellers of one kind by how well staffed each is, and a seller with no rival in town keeps everything. So in a small town a seller almost never loses a customer. After this part a seller's share of its sector's outside demand moves with its own price and capacity against the rest of its sector in the state.

**Cause.** Found in code: `divideOutsideSales` (src/core2/residents-economy.ts, the function below `scaleOutsideSales` at line 476) divides one kind's outside spending among that kind's sellers in the same town by service level alone, and gives a lone seller all of it (stopgap SG-CORE-outside-share-service-level, src/core2/data/stopgaps/core.json line 599).

**Fix.** Make the rivals the sector's other sellers in the state, which the tier holds as the sector's cell, so a lone seller in town still gains or loses against the cell. A seller's share moves on two sliding scales that are already on its books: its price against the sector's price in its state (`SectorCell.price`), and its capacity (the service level and output limit this function already reads). The cell's total is unchanged; only the seller's share of it moves. The two elasticities are rows in the parameter table, tagged TUNABLE with the spread they were checked against. Standing with customers is in the design and no record holds it yet: leave it out and say so in the stopgap row, which this part narrows to that.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice and sliding scales: a share moves by degrees with price and capacity, never by a roll or a threshold. Replace, never layer: the kind-in-town division is replaced, not kept beside the new one. Every number in a parameter table with its tag. One model, two tiers: a counted business is read by the same rule times its count.

**Done when.** A second session runs scripts/world-proofs/jobs-24-months.ts on main in a drawn place it names with its seed and reads outside sales by seller: at least two sellers of one sector take different paths. A test in a drawn place raises one seller's price by a tenth and sees its outside sales fall over the following months while its sector's total in the state does not change. In the running game, Trace on that seller's flow shows its share and what moved it.

**Waits on.** core-country-tier-town-joins-its-state-part-2-outside-buyers-follow-the-sector.

**Files.** src/core2/residents-economy.ts, src/core2/country-model.ts, src/core2/business-books.ts, src/core2/data/stopgaps/core.json, scripts/world-proofs/jobs-24-months.ts
