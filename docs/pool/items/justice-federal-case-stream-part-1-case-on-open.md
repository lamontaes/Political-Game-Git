---
id: justice-federal-case-stream-part-1-case-on-open
title: "A federal case, defendant and sentence are built when someone opens one, through the justice case flow"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: high
root: rc1-world-outside-town
source: split from justice-federal-case-stream in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The federal courts keep only a monthly flow and a stock by offense group, so no federal defendant, judge or sentence exists to read. Build one on open: choose a federal offense group and a month from the flow, fill in a defendant from the counted population, name a judge, and file the case and its sentence through justice.ts's existing case flow, with the sentence length from the Sentencing Commission's mean for the group reduced by the mandatory-minimum law in force. The filled-in defendant must match the counts the flow stands on. Feeds: justice-federal-case-stream.

**Cause.** Found in code: src/core2/modules/federal-courts.ts (`federalCourtsFor`, line 142; header: "No case, judge or defendant is kept") keeps counts only; src/core2/modules/justice.ts has no federal case (it declines a federal office at line 1426). The sentence reduction is `reductionFactor` (federal-courts.ts, line 112) and the law key is `REDUCE_MANDATORY_MINIMUMS`.

**Fix.** Add an open-a-case function beside `federalCourtsFor` that returns a justice.ts case, defendant and sentence for an offense group and month, seeded from the world so the same case returns every time, with the sentence read through `reductionFactor`. Do not add a second court system.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine: justice.ts case flow, not a second court system. One model, two tiers: the filled-in defendant matches the group's counts, and a counted case is read by the same rule as a named one times its count. No dice: the sentence is the Sentencing Commission's mean for the group under the law in force. An effect is a read, not a record: the case reads the mandatory-minimum law at the moment it sentences.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a drawn place and seed (named) and opens a federal case for each offense group with a test in src/core2. Each case names its defendant, judge and sentence by record id through justice.ts, the same case returns when opened again, and the defendants opened for a group never exceed the group's count in the flow.

**Waits on.** Nothing.

**Files.** src/core2/modules/federal-courts.ts, src/core2/modules/justice.ts, src/core2/data/justice/federal-groups.json, src/core2/federal-case-open.test.ts (new)
