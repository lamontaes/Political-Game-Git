---
id: nation-federal-scandal-producer-part-3-approval-push
title: "A reported federal act moves the President's approval by a sourced effect"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: nation-federal-scandal-producer-part-2-press-reports
blocked-on:
lead: nation
model: sonnet
effort: medium
root: design-story-director
source: split from nation-federal-scandal-producer in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The national opinion engine has a writer for pushes (`pushOpinion`) but nothing sends it a scandal. When the press runs a federal official's act, push approval by the effect the research gives (Iran-Contra: 63 to 47 in two months, recovered over about 20 months; Watergate: 62 to 24 over 21 months; Gallup, news.gallup.com/poll/4258). This is part 3 of nation-federal-scandal-producer. Seen: the President's approval number falling after the paper reports a federal scandal.

**Cause.** Found in code: `pushOpinion` in src/core2/modules/national-opinion.ts (line 70) records a push by kind and source id, and no caller sends it a scandal.

**Fix.** When a story names a federal act, call `pushOpinion` with kind scandal, the act's record id as source and a negative size and half-life from the dated readings, cited; approval then moves only for an act the public learned of.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Knowing is a read: approval moves only for an act the public learned of through the press. A push is sourced, with its half-life from the dated readings. No dice: the size follows the story, never a draw.

**Done when.** A second session, not the builder, plays a one-year world (buildBenchWorld) in a place drawn from all 56 on a seed nobody chose and sees the next approval row cite the act's record id and a negative push; src/core2/federal-scandal.test.ts passes and names the place, seed and record ids.

**Waits on.** nation-federal-scandal-producer-part-2-press-reports.

**Files.** src/core2/modules/national-opinion.ts, src/core2/modules/press.ts, src/core2/federal-scandal.test.ts (new)
