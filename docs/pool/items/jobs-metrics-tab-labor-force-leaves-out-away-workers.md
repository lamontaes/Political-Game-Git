---
id: jobs-metrics-tab-labor-force-leaves-out-away-workers
title: "The Metrics tab's unemployment rate reads about one and a half times the town's own rate"
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
lead: jobs
source: "Account lead F1, Nov 14, 2026, tracing why Tanapag's jobless count fell in its first months"
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** A town with 9.8% of its workers out of work shows 13.9% on the Metrics tab, and the paper, talk and the outcome web read the same figure, so every town in a new life reads about half again as hard up as the world's own rate. A player who opens a town sees a jobs problem the world does not have. Seen: the Metrics tab's unemployment row on the first day of a new life.

**Cause.** Measured: three drawn places, 1,500 people, the tab's rate and the region's rate on day 1 (January 21): Tanapag, Northern Mariana Islands (seed 9e95b68a47a0d28082fc4d0185f47064) 13.9% (57 out, 353 in work) against 9.8%; Maloata, American Samoa (seed probe-b) 14.0% (56 out, 343 in work) against 10.9%; Staples, Connecticut (seed probe-a) 4.4% (20 out, 430 in work) against 3.3%. The opening draws the jobless against the town's whole labor force (524 workers held at Tanapag, from a temporary log in `bandQuotas`), which includes the counted households' out-of-town workers (`unplacedWorkers`, which have no job row), while `townMetrics` in src/core2/modules/world-metrics.ts counts only residents with a job row or a wage flow (328). The paper's quiet-month check in src/bench/printed-words.ts also built its own labor force from the town's firms' jobs.

**Fix.** Add each counted household's out-of-town workers at its weight to the town's residents in work in `townMetrics`, and read the one `residentsEmployed` in the paper's check. Prove at the three places above on day 1, before and after.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record (`wire-to-the-world`): the tab, the paper and talk all read the one rate from `townMetrics` and none sums its own labor force. No dice.

**Done when.** A second session, not the builder, runs a test on day 1 at Tanapag, Northern Mariana Islands, Maloata, American Samoa, Staples, Connecticut and a drawn place nobody chose, and the Metrics tab's rate reads within a fifth either way of the region's rate the opening drew against.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-metrics.ts, src/bench/printed-words.ts, src/core2/metrics-labor-force.test.ts
