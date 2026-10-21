---
id: gov-recall-for-cause-start
title: "A reported scandal or crime starts a for-cause recall where the state requires grounds"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-corruption-honest-pull-calibrated
source: added with npm run pool -- add
---

**What.** Recalls start only when a county or city ordinance takes effect, and only where the state allows recall without grounds (src/core2/modules/recalls.ts), so recalls.organize, recalls.sign and recalls.vote never run in most places and personality never reaches them. Where the state's recall rule requires grounds, read from its rule data, let a recorded scandal or crime against an official (a press exposure or a justice charge) start a petition.

**Rules.** One rule, all 56 places: the grounds rule comes from data, never a state name; no dice: who organizes and signs comes from their reasons and traits through the recalls decisions' own weights.

**Done when.** In a one-year buildBenchWorld run of a drawn place whose state requires grounds, a recorded exposure or charge starts a recall, and recalls.organize and recalls.sign run with their weights, named by record id.

**Files.** src/core2/modules/recalls.ts

**Notes.** TODO
