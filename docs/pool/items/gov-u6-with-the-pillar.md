---
id: gov-u6-with-the-pillar
title: "U6 (with the pillar):"
area: gov
kind: feature
priority: 2
status: done
claimed-by: claude/gov-bribe-buys
pr: #4573
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OPUS-GOV.md line 203 (unchecked checklist line)"
claimed-at: 2026-10-16T03:13:55.677Z
---

**What.** A bribe today pays an official but buys nothing, so background corruption has no cause or effect. Make the bribe buy something real: a vote position on a bill, a contract award or a permit decision, with the official deciding from their traits, relationships, money and the law, and the buyer getting the thing they paid for or not. The player would notice that a contract goes to a business whose owner paid a council member, and that the news can say so after a case.

**Rules.** No dice: whether the official accepts and delivers follows their traits, money and relationships, never a percentage; The chain is the acceptance: follow one bribe to the vote or award it bought, the payment that changed, the person it reached and the trial that may follow; An effect is a read, not a record: the legislature and the contract awarder read the obligation at the moment they decide; Ask why: the vote and award keep the bribe as a reason by record id when the official acts on it; Wire to the world: it moves money between a named briber, an official and a treasury in a generated world and covers every office with a vote or award; One rule, all 56 places: bribery law and thresholds are data for all 56 places; Placeholders: the pillar's SG-GOV rows for corruption close only when the vote or award reads the bribe.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a bribe in the year changes a named official's vote or a named contract award, and the sentencing case later cites it by id; tests in `src/core2/corruption.test.ts` (new or existing) cover accepted-and-delivered, accepted-and-reneged and refused. The owner plays it: reads a news story that a contract went to the business whose owner had paid the councilman.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/interest-groups.ts, src/core2/modules/legislature.ts, src/core2/modules/justice.ts

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.
