---
id: world-dwelling-position
title: "A dwelling has a place inside its town, so a street, a ward or a precinct can be drawn from where people live"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: found by gov-ward-map-from-dwellings
claimed-at:
checked: fable 2026-11-10
---

**What.** A dwelling in the core is a row keyed to its household with a tenure and a value, and nothing says where in the town it stands. Without that no council ward, precinct or school zone can follow where people live, and every such map is the households in recorded order. Give each dwelling a position inside its town, drawn from the town's real shape (its census tracts or block groups where the data has them, an estimate with a spread otherwise), so that neighbors are close and a map cut follows the town. Its only reader today is gov-ward-map-from-dwellings, which is blocked on this item and was deferred Oct 25, so this is low value until that moves.

**Cause.** Design: docs/pool/items/gov-ward-map-from-dwellings.md (ward maps need positions; stopgap SG-GOV-ward-map) and the tract shares from the ACS B01003 file named in the Notes.

**Fix.** Give each dwelling a position from the place's tract or block-group population shares (an estimate with spread), stored with the dwelling in src/core2/modules/housing.ts and read by ward and precinct drawing in src/core2/modules/voting.ts.

**Time box.** 6 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: gov-ward-map-from-dwellings (the council districts the player files in and runs for, drawn from where people live).

**Rules.** Estimate, never UNKNOWN: a dwelling's position starts from the place's own tract or block-group population shares and is marked as an estimate with its source. One rule, all 56 places: no state, city or GEOID in logic; the shares live in data. Wire to the world: ward maps and polling places must read the position the same day it is used, so it is a read and not a record nobody opens.

**Done when.** A second session (not the builder) plays a world (`buildBenchWorld`) in a drawn place and seed named in the PR body and sees every household's dwelling record carry a position, the dwellings per tract reported beside the place's tract population shares with the stated spread, and a test in src/core2 reading the positions from voting.ts to draw the town's wards by dwelling record id.

**Waits on.** Nothing. Its reader, gov-ward-map-from-dwellings, waits on this item.

**Files.** src/core2/modules/housing.ts, src/core2/modules/voting.ts, src/core2/data/housing/housing.json

**Notes.** Needed by gov-ward-map-from-dwellings (stopgap SG-GOV-ward-map). Oct 19.

Oct 20 (research-reachable-sources-oct20): unblocked. Tract and block-group population shares come from the bulk files under https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/ and the Census Gazetteer at https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/ (both HTTP 200 from a cloud session). The done-when stands: a played world (buildBenchWorld), a drawn place and seed named in the PR body.

Fetched Oct 20 (research-reachable-sources-oct20): total population by tract and block group from B01003 in the 2023 ACS 5-year table-based summary files (https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/data/5YRData/acsdt5y2023-b01003.dat, 18,311,997 bytes, SHA-256 24ae3f523b4c54332ce0a71ba534569685a8a729056f975915d860d1eb943565): 85,381 tract rows (GEO_ID prefix 1400000US) and 242,296 block-group rows (1500000US). Check: Autauga County, Alabama has 17 tract rows summing to 59,285, equal to its county row (0500000US01001). The shares per tract are therefore a straight division of the tract row by its county or place total; the builder keeps the file out of the repository and records the values it uses with this citation.

Oct 25 audit: From the dropped world-dwelling-locations: the first reader is gov-ward-map-from-dwellings, now blocked on this item.

Deferred Oct 25: nothing on screen reads it yet.
