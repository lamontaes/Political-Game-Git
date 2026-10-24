---
id: people-drives-responses-against-research-bands
title: "Drive responses and perception match how people really respond to loss"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Drives form as one scored choice among responses (carry on, take up a cause, hold a grudge, guard family, prove oneself, answer a calling) whose pressures and trait channels are prototype values (SG-P10-response-model and SG-P10-perception-model in src/core2/data/drives.json). The trajectory meta-analysis of Galatzer-Levy, Huang and Bonanno (2018) found 65.7% of people resilient after a potential trauma (95% interval 61.6 to 69.8), 20.8% recovering, 10.6% chronic and 8.9% delayed, stored in data/research/people/trauma-trajectories-2018.json. The response pressures should be set so the share who carry on after a bereavement lands in that band in played years, and each perception channel's trait list should be checked against an appraisal study with a published effect, recorded as its own research file. No convertible appraisal effect was found in the research pass, so that part starts with the search.

**Rules.** No dice: the band checks the town's share; it never becomes a chance that picks who carries on, which stays each person's own scored choice. Ask why: every drive formed names the event and the traits and ties that weighted it.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named), scripts/research/people-year.ts reports the share of bereavement responses that carry on inside 61.6 to 69.8 percent, each drive decision record names its event, and src/core2/drives.test.ts holds the band over a fixed fixture of perceived losses.

**Files.** src/core2/data/drives.json, src/core2/modules/drives.ts, src/core2/data/parameters.json, data/research/people/trauma-trajectories-2018.json

**Notes.** TODO
