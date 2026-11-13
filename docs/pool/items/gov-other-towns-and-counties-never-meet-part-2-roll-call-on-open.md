---
id: gov-other-towns-and-counties-never-meet-part-2-roll-call-on-open
title: "Opening another town's result builds its roll call"
area: gov
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results
blocked-on:
lead: nation
model: sonnet
effort: medium
root: rc1-world-outside-town
source: split from gov-other-towns-and-counties-never-meet in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A neighboring town's result is kept without its members or votes. When the player opens one from the News or the Government screen, the meeting, the members and the roll call must be built on demand from the kept result, the same every time and adding up to the vote count. Without it a neighbor's decision could be shown but never examined. The roll call is built when the player opens the result, not kept. Feeds: gov-other-towns-and-counties-never-meet

**Cause.** Found in code: src/core2/modules/world-legislating.ts function rollCallOf (line 1548) is the on-demand roll-call pattern for the player's own bodies; src/bench/government.ts and src/bench/nation-news.ts are the screens that open a result.

**Fix.** Build the roll call for a kept result with the rollCallOf pattern, seeded from the result's record id so it is identical on a second opening, and open it from the News and Government screens.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which other local bodies exist and when they sit comes from each place's data rows, read by the one body engine, with no second engine and no named place. No dice: what another town's board passes follows its members' views and the place's conditions, never a rate, a cap or a chance. An effect is a read, not a record: another town's result counts only when a different engine reads it, named by record id. The speed rule applies: results only, on the days a body sits, and nothing scans every town every day (owner, Nov 5: "generate on demand").

**Done when.** A second session, in a drawn place after one played year, opens one other town's result from the News or the Government screen and finds its roll call, identical when opened a second time and adding up to the result's vote count, with a screenshot of the list and of one opened result.

**Waits on.** gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

**Files.** src/core2/modules/world-legislating.ts, src/bench/government.ts, src/bench/nation-news.ts
