---
id: metrics-town-jobs-one-rule
title: "One counting rule for the town's jobs, seekers and unemployment, written once with its inputs"
area: world
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
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
