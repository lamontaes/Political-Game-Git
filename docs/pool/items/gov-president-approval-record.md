---
id: gov-president-approval-record
title: "The public's approval of the president is a monthly record built from the president's acts, what people heard and the economy they feel"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: 
blocked-on: 
milestone:
source: split from elections-stopgap-electorate-inputs-missing-data by pool feeder Oct 20
---

**What.** Add a monthly president-approval row, written by the executive side and read by the elections side, that says what share of the country approves of the sitting president and why. Each full person and each counted voter group approves from their own view of the president (their lean against the president's party through viewOn and standingWith in src/core2/modules/views.ts), the acts of the president they have heard of (signed or vetoed bills and orders reached through news, per the knowing-is-a-read rule), and the economy they feel (their own pay and prices, with the macro unemployment and inflation change that nationalEconomyChange reads). Sum over people and groups, then record the share with the reasons that moved it since last month.

**Rules.** Knowing is a read: a person's approval moves for an act only if news, a conversation or a notice reached them. No dice: approval follows lean, heard acts and felt conditions, never a roll, and real Gallup series only check where a year lands. One model, two tiers: a counted group approves by the same rule as a person, times its count. Sliding scales and causes: nothing flips at a threshold; a small gap in feeling moves approval a few points. Ask why: the row cites the acts and conditions that moved it, by record id. Estimate, never UNKNOWN: a month with no data starts from the real average approval with a spread.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, twelve monthly president-approval rows exist, a signed bill the news carried moves the next month's row, and the row cites the act and condition record ids; src/core2/president-approval.test.ts proves it and the year stays within 20 percent of the speed before.

**Files.** src/core2/modules/executive.ts, src/core2/president-approval.ts, src/core2/modules/views.ts, src/core2/modules/press.ts, src/core2/president-approval.test.ts

**Notes.** Oct 20 (pool feeder): part 1 of 2 of elections-stopgap-electorate-inputs-missing-data. gov-president-signs-budget and core-president-address-news already give the president's acts to the news.
