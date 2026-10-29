---
id: play-player-runs-only-six-offices
title: "The player can file only for city council, state legislator, mayor, governor, Congress and president"
area: play
lead: play-first
kind: bug
priority: 1
size: S
status: done
claimed-by: play-first/play-player-runs-only-six-offices
pr: #6828
blocked-on:
milestone: play-first
source: owner, Oct 29 voice note on the governing brief
claimed-at: 2026-10-29T21:16:49.698Z
---

**What.** The owner, Oct 29: "why are you able to run for trustee and county clerk and shit? No, the player only runs for city council, state legislator, mayor, governor, Congress, and president. That's it. The other stuff can be simulated or whatever, but no, not the player." Today the filing screen and the headless path-check let the player file for county commission, trustee and clerk seats. Those offices keep running in the world with simulated candidates; only the player's filing choices narrow to the six.

**Rules.** One engine per mechanic: the narrowing is a data row on the office (player-eligible), read by the one filing screen, never a list of office names in the bench. Replace, never layer: the old choices are removed from the player's filing list, not hidden behind a flag.

**Done when.** A browser check in the bench at a drawn place lists the player's filing choices and fails if any office outside council, state legislator, mayor, governor, U.S. House, U.S. Senate or president appears; a test shows simulated candidates still file for county and township seats in the same played world.

**Time box.** 2 hours, Sonnet.

**You will see.** On the filing screen you can choose only city council, state legislator, mayor, governor, U.S. House, U.S. Senate or president.

**Screenshot.** The filing screen's choices at 1440 by 900 from a drawn place, before and after, in the PR body.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/core2/data/offices/bodies.json, src/bench/path-check.ts

**Notes.** Filed by the CTO, Oct 29, from the owner's voice note on the governing brief (OWNER-DECISIONS, Oct 29 21:40 UTC). Read: OWNER-DECISIONS, DECISION-REGISTER, the governing brief's four research notes; searched the pool for twins.
