---
id: words-writing-rules-from-grades
title: "The owner's grades and voice notes become writing rules that reweight every line"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: story/writing-rules
pr: "#7994"
blocked-on:
lead: words
milestone: play-first
source: "owner, Nov 9, 12:30 to 12:55 a.m., through the CTO's Story brief"
claimed-at: 2026-11-09T07:30:00.000Z
---

**What.** The owner, Nov 9, 12:45 a.m.: research gaming dialogue so that bad lines do not happen again, and learn from how he grades. Each grade and note becomes a rule in one data file that the words work reads before writing or choosing. A rule that names a feature of a line is also a lesson on the grade map, so it reweights every line that holds that feature.

**Rules.** Sliding scales and causes: a rule moves weights on a sliding curve and never bans a line outright. Serves `words-engine`: a rewrite never deletes a line the owner graded good, checked by the liked-lines test.

**Done when.** data/english/writing-rules.json holds the rules with the owner's quotes and the research behind them; each rule with features moves the weight of the lines holding them on the grade map, shown by a test and by scripts/dialogue-batch/rule-reach.ts; the PR says per rule how many lines changed.

**Time box.** 3 hours. If not done, push what exists, open the PR and write the handoff.

**You will see.** Lines that open with filler, ask a question that names nothing, or give in at once come up less often everywhere.

**Screenshot.** Not a screen; the coverage numbers in the PR body.

**Files.** data/english/writing-rules.json, src/english/span-features.ts, src/english/grade-map.ts, scripts/dialogue-batch/rule-reach.ts
