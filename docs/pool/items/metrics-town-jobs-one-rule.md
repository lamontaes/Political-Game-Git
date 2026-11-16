---
id: metrics-town-jobs-one-rule
title: "One counting rule for the town's jobs, seekers and unemployment, written once with its inputs"
area: world
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by:
pr: 9391
after: metrics-output-numbers-registry
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-12
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** The town's unemployment is counted one way in the metrics module and another way in the jobs panel, so two screens can show different people at work and looking. Both must use the one rule the jobs engine already uses: counted people by weight, and workers placed out of town inside the labor force. The metrics module writes the four figures monthly with the inputs beside them, and the jobs panel reads that row. Seen: Metrics' town unemployment, people at work, people looking and open jobs, with last year.

**Cause.** Found in code: src/core2/modules/world-metrics.ts:102, 115 and 137 count a counted worker once and leave out-of-town workers out of the labor force. src/core2/modules/world-panels.ts:59 and 75 count them by weight.

**Fix.** One counting function, by weight and with out-of-town workers. world-metrics writes it monthly with its inputs (seekers named, seekers counted by weight, at work named, at work counted by weight) through the registry; `townJobsPanel` reads the row and its own employed and seekers count is deleted.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers (owner, Oct 14): a counted group is read with the same rule as a full person, times its count, so the labor force counts counted workers by weight. Ask why: the figure's inputs are kept beside it, so a trace can say by record id where the number came from. Replace, never layer (owner, Oct 14): the old counting code is deleted in the same pull request, and the pull request body counts what was removed.

**Done when.** A second session plays 14 months in a drawn place, naming the place and seed. Metrics shows the four figures with last year. Dev mode's Trace on unemployment shows seekers and workers by tier summing to the rate.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/modules/world-metrics.ts, src/core2/modules/world-panels.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12. Owner, Nov 12, 3:43 p.m. (CTO line on issue 8928): the plan is approved as written, and a small town shows its own count with the people behind it ("13 of 86 looking for work"), never a blend and never the county's figure.

Built (Account lead thread, Nov 15). Cause found: three places counted the town's jobless three ways. The month row counted every person with a job-search record once, so a counted household's seeker weighed 1 and a worker already employed and job-hunting counted as unemployed; the rate used a second loop; the jobs panel used a third, by weight. Seen at Washington, Kansas, July 21, 2025: the Metrics tab said 53 looking while 28 were jobless; at Saugatuck, Connecticut, 131 against 59. Fix: `townLaborByPlace` in `world-panels.ts` is the one pass (people with no job, once each, counted households by weight, out-of-town workers inside the labor force); `townMetrics` and `townJobsPanel` both read it and the duplicate loops in `world-metrics.ts` are deleted. Proof: `src/bench/metrics-jobs-one-rule.test.ts` at Washington, Kansas (599e6f66e9c1d25a) and Everett, Georgia (7a5e19c2b3d84f60).
