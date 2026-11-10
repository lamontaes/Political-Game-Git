---
id: gov-other-towns-and-counties-never-meet-part-3-readers-and-speed
title: "Another engine reads a neighbor's result, and the year stays fast"
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

**What.** A result nobody reads is a placeholder. The press or the regional economy must read a neighbor town's result by record id, a test must fail if every local result in the world belongs to the played town, and the year must stay inside the speed bar with records before and after reported. Without a reader the new results would be records nobody uses. Seen: the News tab's stories of what neighboring towns and counties decided.

**Cause.** Found in code: src/core2/press-desk.ts function runDesk (line 623, the desk that picks stories) and src/bench/nation-news.ts (which shows them) are the readers to extend; neither reads another town's local result today, since none exists (see the Measured cause in gov-other-towns-and-counties-never-meet).

**Fix.** Make the press desk read other towns' and counties' results as stories, add the test that plays a drawn place for a year and fails if every local result belongs to the played town's own bodies, and report records kept and seconds before and after.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which other local bodies exist and when they sit comes from each place's data rows, read by the one body engine, with no second engine and no named place. No dice: what another town's board passes follows its members' views and the place's conditions, never a rate, a cap or a chance. An effect is a read, not a record: another town's result counts only when a different engine reads it, named by record id. The speed rule applies: results only, on the days a body sits, and nothing scans every town every day (owner, Nov 5: "generate on demand").

**Done when.** A second session, in a drawn place after one played year, finds the News telling what a neighboring town's council decided, naming the result's record id in dev mode's Trace, and finds the test failing when the other bodies are switched off; `npm run speed:year` stays inside the bar, with the records kept and seconds before and after in the PR body.

**Waits on.** gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

**Files.** src/core2/press-desk.ts, src/bench/nation-news.ts, src/core2/modules/world-legislating.ts
