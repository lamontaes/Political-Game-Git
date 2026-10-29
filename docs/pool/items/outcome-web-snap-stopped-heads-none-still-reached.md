---
id: outcome-web-snap-stopped-heads-none-still-reached
title: "SNAP work-requirement test: no stopped head is still reached (North Hodge, Louisiana)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/outcome-web-public-finance.test.ts 'stops the heads the law reaches after their own months' fails on clean main (d4f61f3c07, Oct 28 17:45 UTC) with PUBLIC_FINANCE_SEED=d4592d3821f01152: North Hodge, Louisiana (2255910), place seed 914395bc9c354954d47a84fd2dbd0198844470db85e2f9a70bd0031a9a3b4258, 'a stopped head the law still reaches: expected 0 to be greater than 0'. The benefit stopped heads, but by the end of the run the requirement reaches none of them, so the test finds no stopped head to check. Either every stopped head left the requirement's reach (age, work, household) or the reach and the stop read different records. The laws session found it while checking the grocery exemption change and did not change the SNAP engine.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test or the engine. No dice; never weaken the test: if every stopped head truly left the requirement, the test passes over the place with a reason, as it does for a place with no SNAP law.

**Done when.** The test passes on seed d4592d3821f01152 (North Hodge, Louisiana) and on two fresh drawn places named with their seeds, and the item Notes name why each stopped head left the requirement's reach, by person id and the record that moved them.

**Files.** src/core2/outcome-web-public-finance.test.ts,src/core2/law-reach/group-b-food-aid.ts

**Notes.** TODO

Oct 29 00:40 UTC (laws session): evidence. Red again on clean main (dfcfc8691d) with PUBLIC_FINANCE_SEED=90a0a7a5c5c3738a: Gallipolis Ferry, West Virginia (5429716, US-WV), place seed 3809cf3e584e286967cdccca1a1117165adf9be619e6881895a94a97ff630dbf, "a stopped head the law still reaches: expected 0 to be greater than 0". It turned the unit run of PR 6708 red.
