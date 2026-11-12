---
id: jobs-regional-rows-outlive-their-person
title: "A counted resident's regional job stays on file after they move away, die or return to the counts"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: low
root: rc5-full-detail-every-day
lead: money
source: written by the speed lead from the Nov 11 regional-rows probe (#7365)
---

**What.** The jobs engine keeps one `regional` row per counted resident working in the wider region (`src/core2/modules/jobs.ts`, written where a counted seeker accepts regional work, about line 2555). It removes a row only when the turnover pull lays the worker off (`reviewTurnover`, about line 2388). A resident who moves away, dies, or is filled in keeps the row, and the turnover prune treats every regional row as live, so the row is kept forever and the worker still counts as at work (`abroad`, about line 4074, keeps them out of the jobless). Seen: the town's jobless count and unemployment rate on the economy screen, which count a gone resident as employed.

**Cause.** Measured: South Hooksett, New Hampshire (3371220), seed s8333, main ea69fde1, a probe classifying each `jobs.regional` row every six months. The rows whose person is no longer a counted resident (moved, died or returned) numbered 124, 281, 453 and 642 at months 6, 12, 18 and 24. Live counted residents numbered 11,397, 13,601, 16,038 and 17,732. Found in code: src/core2/modules/jobs.ts `reviewTurnover` skips a row whose person has no birth date on file (`if (!birth) continue`) without removing it, and its prune keeps every `regional` row's key.

**Fix.** In `reviewTurnover`, remove the `regional` row and its `turnover` pull when the row's person is no longer a counted resident of the town (`residentFacts` undefined and not a full person working there), and end their regional work as a departure would. The person filled in keeps a commuter job through the outside account, as full people do today, so a filled-in resident's row also goes.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted resident's job ends by the same rule a full person's does when they leave, die or change tier. Wire to the world: the jobless count and turnover read the fixed rows. Speed: the turnover table stops carrying rows for people who are gone.

**Done when.** A second session plays South Hooksett, New Hampshire (3371220, seed s8333) and a drawn place for two years in the played world: every `jobs.regional` row names a counted resident of the town, and the jobless count in the economy panel differs from main by no more than the stale rows removed. A test in a drawn place shows a counted regional worker who moves away loses the row.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts
