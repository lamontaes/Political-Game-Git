---
id: core-country-tier-town-joins-its-state-part-2-outside-buyers-follow-the-sector
title: "The town joins its state, part 2: a seller's outside buyers follow its own sector in its state and the nation, not one factor for the whole town"
area: core
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/fable-b2-outside-by-sector
pr: #8363
after:
blocked-on:
lead: money
model: opus
effort: high
root: design-country-tier
source: split from core-country-tier-town-joins-its-state by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
---

**What.** About four fifths of a small town's business sales are to buyers outside the town. Today all of them move by one number for the whole place each month, so no seller's demand ever differs from its neighbor's. After this part a seller's outside buyers follow the sales of its own sector, which the country tier already keeps for every state.

**Cause.** Found in code: `publishConditions` (src/core2/modules/macro.ts line 148) passes one factor, the nation's prices times real output times the region's demand, to `scaleOutsideSales` (src/core2/residents-economy.ts line 476) for every outside-sales flow of the place. The tier keeps each sector's monthly sales in each state (`SectorCell`, src/core2/country-model.ts line 202) and nothing reads them for the town.

**Fix.** Part 1 (pull request 8172) gives every business kind a sector, read with `sectorOfKind` in src/core2/business-books.ts. Pass `scaleOutsideSales` a factor per sector in place of the one number. For a seller of a sector in a state, the factor is that sector's sales this month over its sales in the opening month: the state's cell for the part of the sector that sells at home, and the nation's sum for the traded part (`tradedShare` in the tier's rules, country-model.ts line 135). Sales are dollars, so the separate price term drops out for these flows. Read the factor once a month per sector, never per flow. Leave the finance condition's `macroDemandFactor` as it is. Delete the one-factor path in the same change. Add an outside-sales-by-sector column to scripts/world-proofs/jobs-24-months.ts.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: the factor is a read of the tier's own records. Replace, never layer: one way to scale outside sales. Speed: one read per sector per month. An effect is a read, not a record: the pull request names the sector cell each seller's flow followed, by record id.

**Done when.** A second session runs scripts/world-proofs/jobs-24-months.ts on main in a drawn place it names with its seed and reads the new column: outside sales differ between at least two sectors in at least six of the 24 months. In the running game, dev mode's Trace on one seller's outside-sales flow names the sector and state it followed. The pull request prints the town's total outside sales for the first year under the old rule and the new, so a reader sees the level did not jump.

**Waits on.** core-country-tier-town-joins-its-state-part-1-each-seller-has-a-sector.

**Files.** src/core2/modules/macro.ts, src/core2/residents-economy.ts, src/core2/country-model.ts, scripts/world-proofs/jobs-24-months.ts
