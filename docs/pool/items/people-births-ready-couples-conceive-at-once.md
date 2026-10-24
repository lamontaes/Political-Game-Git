---
id: people-births-ready-couples-conceive-at-once
title: "Every couple ready for a child conceives at its next review, so births run about 1.3 times the state rate and a town's ready couples arrive as one wave"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-births-over-state-rate-small-town
source: added with npm run pool -- add
---

**What.** After the births calibration (branch claude/quirky-ride-vrwwz4-births), M1-09's births test passes in Roche Harbor, Washington (5359075, seed 2cff037427070ab820471240abf093b2a383133b4fe484274019a40fd2076e26) and five more drawn places, but births still total about 1.3 times the test's expectation (28 against 21.7), and Concord, Illinois (1716054, seed 99f462cf428e4898d2861e98e43f4079d0ca4a485b604ed49d569c4bcc5d90a9) sits near its upper limit with 9 against 3.39. The plan decision in src/core2/births-plan.ts flips to 'plan' once a couple's score is above zero, and src/core2/modules/renewal.ts initialize() reconstructs every ready couple's pregnancy at the opening, so about 25 ready couples in Roche Harbor all conceive at once. How long a ready couple takes to conceive (from their score and the mother's age) is the deeper fix; whether a sourced mean time to conception counts as a fixed percentage deciding an outcome needs the owner's word.

**Rules.** No dice and sliding scales: how soon a couple has a child follows their own circumstances and age on a sliding scale, never a yearly chance; the state's real birth rate only checks the town's total.

**Done when.** M1-09's births test passes in Roche Harbor, Washington and Concord, Illinois (seeds above) and three more drawn places named with seeds, with births within 15 percent of the expectation on average across them, the owner's ruling on time to conception cited, and the cause named by line in the PR.

**Files.** src/core2/births-plan.ts, src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json

**Notes.** TODO
