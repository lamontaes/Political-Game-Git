---
id: jobs-public-post-pay-is-163-cents-an-hour-for-a-clerk
title: "A town clerk's post pays $1.63 an hour for a full-time week, under the minimum wage, and the clerk's own case says so"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: opus
effort: medium
root: none
source: played run for PR 9394 on Nov 15, 2026, case-help office hours at Iaeger, West Virginia, seed case-help-pinned-1:help:27
checked:
claimed-at:
---

**What.** In Iaeger, West Virginia (GEOID 5439652), seed case-help-pinned-1:help:27, the town clerk, person_99ea9ce76e63e8d9, holds the work commitment `job:public:town:city-clerk:person_99ea9ce76e63e8d9` with `hourlyMinor` 163 over 2,550 expected minutes a week (a full-time public-office week, source ESTIMATED from the post's pay). The minimum wage in force is $8.75, so the constituent-cases module opens a "paid under the minimum wage" case for the clerk and the clerk brings it to office hours: "$1.63 an hour. The law says $8.75." That is a pay record the world holds, not a wording fault: a full-time clerk at $1.63 an hour earns about $4,160 a year. Seen: a drawn town's clerk, deputy and other appointed public posts show an hourly pay at or above what the place's own budget line for the post and the minimum wage give, and a "paid under the minimum wage" case for a public post comes from a law that changed, never from the opening pay.

**Cause.** Needs cause. The commitment's `paySource` is an estimate from "the post's pay"; which row sets 163 for this post (an appointment's pay in the town's budget, a part-time post counted as full time, or a per-meeting stipend turned into an hourly figure) is not yet read.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record (owner, Oct 13): the pay is read by the payroll, the budget and the case engine alike. Estimate, never UNKNOWN: a pay is a real average with a per-world spread and its source. No dice. One rule, all 56 places.

**Done when.** A second session builds three drawn small towns with buildBenchWorld, writes down their places and seeds, lists every appointed public post's hourly pay and the minimum wage in force, and finds none under it; the Iaeger seed above no longer opens a wage case for its clerk on its first day.

**Waits on.** Nothing.

**Files.** src/core2/modules/work.ts, src/core2/modules/constituent-cases.ts
