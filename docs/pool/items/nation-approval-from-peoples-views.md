---
id: nation-approval-from-peoples-views
title: "The President's approval is a national number moved by the economy, not read from people's own views of the President"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: views
source: story builder thread, Nov 16, the Account lead's ruling on #9614
standard: 2
model: opus
effort: medium
root: none
---

**What.** The President's approval each month is one national number: an opening level moved by the economy's monthly change and by pushes other engines write. People in the game hold their own views of officials, and the poll does not read them, so the game has two sources of opinion. In time the poll should be the sum of people's own views of the President, full people and counted groups by the same rule.
Seen: the poll on the News page moves only with the economy, while the people the player meets hold views of their own.

**Cause.** Found in code: src/core2/modules/national-opinion.ts `monthlyRun` builds `pct` from `openingPct`, the macro months' change in unemployment and inflation and the decaying pushes; it reads no person's view. The thread "Build voters' views from their lives" is building those views from people's lives.

**Fix.** Once the views thread's work gives each person and counted group a view of the sitting President, `monthlyRun` sums those views for the month's percent and keeps the economy and pushes only as what moves the views, so there is one source of opinion. The published record (`publishApproval`) stays as it is.

**Time box.** 4 hours.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person, times its count.

**Done when.** A second session plays a year in a drawn place on a seed nobody chose and finds the month's approval row citing the views it summed, and the poll on the News page moves with them.

**Waits on.** views-other-places-voters (the views engine holds only the played town's people, so other places' voters have no views to sum), then a view of a sitting official, which the views thread has no item for yet.

**Files.** src/core2/modules/national-opinion.ts, src/core2/modules/views.ts
