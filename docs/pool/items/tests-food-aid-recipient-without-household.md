---
id: tests-food-aid-recipient-without-household
title: "The SNAP played-year test finds a benefit paid to a person with no household (red on main in place 2575050)"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/law-reach/group-b-food-aid.test.ts 'pays qualifying households from the federal treasury' fails on clean main at 823110f41b with the test's seed 8ed706d9b6250495d08e35f371f1ddf6c576e2b18202c832a78b800f30edd8e6. It draws place 2575050 (world seed 49d5401d79dfbc77ab240cc59b92337b8d0601e0cf3e24790c4774e097df0ae1), where a SNAP payment names person_d0a4a3492a694441 as recipient and that person has no household. The seed is random per run (randomBytes at line 67), so CI fails on some draws only. Whether SNAP should stop when a household dissolves, or the person should keep a household, is the root cause to find.

**Rules.** A fix lands where the failure reproduces; flake is not a root cause. One model, two tiers (owner, Oct 14): a benefit's recipient is a household or the person standing for one, by the same rule for full and counted people. Never skip or quarantine the test.

**Done when.** On the replayed seed (FOOD_AID_SEED or a pinned seed added to the test) in place 2575050, the played-year test passes with every SNAP payment's recipient in a household, the cause named by record id in the PR body, and the test passes on one more drawn place with a fresh seed.

**Files.** src/core2/law-reach/group-b-food-aid.test.ts, src/core2/law-reach/group-b-food-aid.ts, src/core2/law-reach/group-b-money.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27: found in PR #6011's gate and replayed on clean main with the same seed (same place, same person).
