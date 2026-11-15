---
id: jobs-2-retail-and-food-split-where-laws-tell-them-apart
title: "Stores split into grocery, fuel station and other retail, because the laws already in the game treat them differently"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: jobs-1-travel-and-cards-show-every-workplace-kind
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 20:44Z and 20:48Z (jobs read as textiles or markets; chains in sectors), 21:00Z (the point is that laws reach businesses by sector; not finely detailed, the effect web must play out); Account lead's five-piece plan, Nov 15 20:59Z; trace by T54 at /mnt/project-files/account-lead/t54-jobs-trace.md"
---

**What.** One "retail" kind stands for every store and one "restaurant" kind for all food service (src/core2/data/business-books.json, 22 kinds). So the effects that should reach one kind of store reach all of them. Owner, Nov 15 21:00Z: "create businesses in those sectors so that laws actually impact certain sectors and businesses"; "it doesn't need to be finely detailed, but... the effects from the effect web... just have to be able to play out" (21:00Z). Seen: Travel, the paper and dev mode's Trace of a sales-tax or fuel law, which name every store alike.

**Cause.** Found in code:

- The grocery sales-tax exemption treats every retail business as a grocery seller (`GROCERY_SELLERS = "enterprise:retail"`, src/core2/modules/budgets.ts:1123); the law's reach row names `enterprise:retail` (src/core2/data/laws/reach-group-b.json, groceries-sales-tax-exempt).
- A legal sale of a licensed good (cannabis today) is split across every retail business by demand (`licensedSellers`, src/core2/modules/place-prices.ts:613).
- Fuel price laws (`adjustPrice` good "fuel", the mileage fee instead of the fuel tax) pay the town's outside account, because no business in town sells fuel.
- The CBP corpus is two-digit only (trace), so nothing in the data splits retail.

**Fix.** Split only as far as a law or effect tells the parts apart (lead, Nov 15). Each kind below names what reaches it:

| Kind                       | What reaches it                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| grocery                    | grocery sales-tax exemption; food at home spending; minimum wage                                                        |
| fuel station               | fuel price and fuel tax laws, mileage fee; household fuel spending stays in town instead of going out                   |
| other retail               | full sales tax; licensed-good sales where a license law names it                                                        |
| restaurant (kept one kind) | no law in the game treats parts of food service differently (no tipped wage or alcohol rule); split only when one lands |

Pharmacy is not split: no record carries drug spending yet (the Medicare drug price row in the bill catalog has no reader); it becomes a kind in the same pull request that gives drug spending a reader. Shares come from one ESTIMATED row per kind by place size, with spread, labeled "from memory; replace with the County Business Patterns detail file" (item jobs-2b). `town-employment-mix.ts` sector 44 picks among them; `GROCERY_SELLERS` becomes the grocery kind; fuel spending goes to the town's fuel stations when it has one. Every reader of `enterprise:retail` is reread and moved to the right kind in the same change.

**Time box.** 5 hours, one Opus session at medium effort.

**Rules.** One rule, all 56 places; numbers ESTIMATED with spread; no new stopgap beyond the share rows' register line; wire to the world; one engine (the existing business and price engines read the new kinds).

**Done when.** In a played year at three named places with seeds: the grocery exemption's tax change reaches grocery sellers only (record ids); a fuel price law's dollar reaches a fuel station in town where there is one; year-1 time per record with and without. A second session sees a grocery and a fuel station in a drawn town.

**Waits on.** Piece 1 (so the kinds show).

**Files.** src/core2/data/business-books.json, src/core2/town-employment-mix.ts, src/core2/town-workplaces.ts, src/core2/modules/budgets.ts, src/core2/modules/place-prices.ts, src/core2/data/business/names.json.
