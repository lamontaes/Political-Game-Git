---
id: world-dwelling-position
title: "A dwelling has a place inside its town, so a street, a ward or a precinct can be drawn from where people live"
area: world
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-cb
pr:
blocked-on: researcher: the town's tract or block-group population shares are not in the repo and the Census data service needs a key the cloud network lacks (api.census.gov answers Missing Key); needs a key or a bulk download
source: found by gov-ward-map-from-dwellings
claimed-at: 2026-10-20T17:06:43.239Z
---

**What.** A dwelling in the core is a row keyed to its household with a tenure and a value, and nothing says where in the town it stands. Without that no council ward, precinct or school zone can follow where people live, and every such map is the households in recorded order. Give each dwelling a position inside its town, drawn from the town's real shape (its census tracts or block groups where the data has them, an estimate with a spread otherwise), so that neighbors are close and a map cut follows the town.

**Rules.** Estimate, never UNKNOWN: a dwelling's position starts from the place's own tract or block-group population shares and is marked as an estimate with its source. One rule, all 56 places: no state, city or GEOID in logic; the shares live in data. Wire to the world: ward maps and polling places must read the position the same day it is used, so it is a read and not a record nobody opens.

**Done when.** In the played world (buildBenchWorld) in a drawn place and seed named in the PR body, every household's dwelling record carries a position, the dwellings per tract match the place's tract population shares within the stated spread, and a test in src/core2 reads the positions from voting.ts to draw the town's wards by dwelling record id.

**Files.** src/core2/modules/housing.ts, src/core2/modules/voting.ts, src/core2/data/housing/

**Notes.** Needed by gov-ward-map-from-dwellings (stopgap SG-GOV-ward-map). Oct 19.
