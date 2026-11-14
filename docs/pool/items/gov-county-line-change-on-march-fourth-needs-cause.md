---
id: gov-county-line-change-on-march-fourth-needs-cause
title: "A county's administration line changes on March 4 in the first year and nothing says why"
area: gov
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "Account lead F1, Nov 14, 2026, found while tracing gov-county-and-city-lines-share-one-employer-staffing"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** In a played world at Ada County, Idaho, the county's administration line triggers a staffing round on 2025-03-04 with a ratio of about 0.98, a small cut. A player who watches the county's budget would see the line move with no vote or notice before it. Seen: the county budget screen's administration line and the Journal around March 4.

**Cause.** Needs cause. Not yet found: which engine or bill amends the county's administration line on that date (its own mid-year amendment, an adopted budget loading, or a fiscal-year rule). Read the staffing round's `change.lawId` for county:16001 on 2025-03-04 and trace the law row back to its measure.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** Nothing flips at a threshold, and a world event has a cause (a bill, a budget rule). Ask why: the line change cites its measure by id.

**Done when.** A second session, not the builder, replays the county line in the drawn place Ada County, Idaho (1608830, world seed fa9893efaaf4cace3dacd5e911dce8d73ba7eb523261dbcb97e5c5c9853c9403) and names the measure id that changed it on 2025-03-04, or shows the line is unchanged and why the round ran.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-a-staffing.ts, src/core2/modules/budgets.ts
