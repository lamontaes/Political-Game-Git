---
id: core-long-run-player-weighed-condensed
title: "Condense the player's own weighed choices after a year, as their acts already are"
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

**What.** The event log keeps the player's own person.weighed rows forever with every option's score and reasons, while their person.acted rows are condensed after playerDecisionDetailDays (365). The decision-detail queue only takes person.acted (decision-detail.ts), so each weighed choice the player ever made keeps its whole table of options. The Oct 20 ruling says that after a year the player's routine decisions keep their summary and reasons.

**Rules.** Oct 20 ruling on decision detail: the player's routine decisions keep their summary and reasons after a year. Speed: records stop growing with the save's age. Words was told before the change; dev-why reads acts only.

**Done when.** A four-year run of the played world (npm run speed:year -- --seed long-1 --years 4, Ringgold, Louisiana) on main and the branch, one process each, keeps dev mode's records proof identical in every table except the player's condensed person.weighed rows in core.durableLog, and src/core2/condense-decisions.test.ts shows a weighed row condensed after a year with its summary and reasons kept and no selected field written as undefined.

**Files.** src/core2/decision-detail.ts,src/core2/condense-decisions.test.ts

**Notes.** lead: speed. Round four; Words told Nov 1 21:12.
