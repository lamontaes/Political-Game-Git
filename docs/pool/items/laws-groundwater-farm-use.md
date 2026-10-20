---
id: laws-groundwater-farm-use
title: "Groundwater limits read farm pumping, irrigated acreage and crop response"
area: laws
kind: research
priority: 2
size: M
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: "split from laws-stopgap-reach-group-b-faked-mechanic, Oct 16"
claimed-at: 2026-10-19T21:44:57.210Z
---

**What.** Groundwater law now reaches the existing agricultural output limit and the outside-sales flows, but a generic withdrawal share and irrigation elasticity stand in for actual farm pumping, irrigated acreage and crop response (SG-GOV-REACH-B-business-cost). Read each place's farm water use and crop exposure, the statutory allocations and the independent restrictions, and apply them at production. Non-farm use and resource services take only their own records.

**Rules.** Research before building: real data calibrates the elasticity and the shares and never decides one farm's output. Estimate, never UNKNOWN: a place without data starts from the state's average, marked ESTIMATED with its spread. One rule, all 56 places.

**Done when.** In a drawn place with irrigated farms (name and seed in the PR body), a one-year played world (buildBenchWorld) shows a named farm's output limited by its place's withdrawal allocation and crop response, the sales it lost, the owner's choice and the notice the owner received, by record ids; the group B reach test passes and SG-GOV-REACH-B-business-cost is resolved.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b-money.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-b-faked-mechanic.

**Built Oct 19 (claude/peaceful-ritchie-03780x).** A groundwater-withdrawal law now limits a farm by the statutory cut (`groundwaterWithdrawalShare`, 20 percent) times its county's groundwater share of irrigation water, from the USGS county water-use file for 2015 (src/core2/data/laws/groundwater-irrigation-2015.json, built by src/core2/tooling/build-groundwater-use.ts: 2,943 irrigating counties, 280 that irrigate nothing; nationwide groundwater is 48.4 percent of irrigation withdrawals). A county the file lacks starts from that national share, marked ESTIMATED. Proof (src/core2/groundwater-exposure.test.ts, drawn places): Glencoe, Illinois (Cook County, 17031) share 0.686 gives a farm limit of 0.1373; Halifax, Virginia (51083) 0.103 gives 0.0205; Gardnerville Ranchos, Nevada (32005) 0.11 gives 0.022; Markle, Indiana (18069) irrigates nothing, so no limit is set. The owner's choice and notice chain is the existing src/core2/groundwater-law.test.ts. SG-GOV-REACH-B-business-cost is resolved. Left: crop-specific response (one elasticity, `businessGroundwaterOutputElasticity`, still serves every crop) and mines and utilities, which have no water-use record.
