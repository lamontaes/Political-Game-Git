---
id: world-jobs-quit-rate-jolts
title: "Quits under the shared chooser fall far below JOLTS: recalibrate the leave and look terms"
area: world
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/quit-rate-jolts
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T12:43:55.936Z
---

**What.** Since full and counted workers decide by the same chooser (world-jobs-counted-choices-one-rule), quitting and looking around while employed win only on a large pay gap, so a played year has far fewer quits than JOLTS reports; counted quits fell from 67 to a handful in one town. Recalibrate quitScore and the look terms (jobsLookBaseline, jobsPayGapWeight and the unemployment weights) so a played year's quits per worker match JOLTS total private quits, from reasons on the record, and resolve SG-WORLD-jobs-quit-rate-uncalibrated.

**Rules.** No dice: a quit follows from the worker's own reasons (pay gap, tenure, strain, savings, scarcity), never a monthly rate applied to one person. Research before building: JOLTS quits calibrate the town's total, fetched with a quote. One model, two tiers: the same terms for full and counted workers.

**Done when.** In one-year runs of the played world (buildBenchWorld, at least six places drawn from all 56, seeds named in the PR body) the pooled monthly quit rate per employed worker falls within the JOLTS total private quits band quoted from a fetched page, shown by job-change record ids, the jobs tests pass, and the tripwire test shows SG-WORLD-jobs-quit-rate-uncalibrated resolved.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json, src/core2/data/stopgaps.json

**Notes.** Filed with the PR on claude/counted-job-choices, which registered the row.
