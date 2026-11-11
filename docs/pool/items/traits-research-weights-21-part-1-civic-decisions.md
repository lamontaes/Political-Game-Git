---
id: traits-research-weights-21-part-1-civic-decisions
title: "Research rows and weights for the civic temperament decisions"
area: people
kind: research
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: traits
model: sonnet
effort: medium
root: none
source: split from traits-research-weights-21 in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Part of traits-research-weights-21. The civic temperament decisions (party attending, group membership, following the news, persuasion, trust, believing a claim and retelling) weigh temperament at the general weight of 1 with no study behind the size. Add each decision's research row and fit its weight so the weight carries its study.

**Cause.** Found in code: src/core2/data/parameters.json carries (rows such as `traitWeightPartiesAttend`) traitWeightPartiesAttend, traitWeightInterestGroupsMemberJoin, traitWeightPressFollowNews, traitWeightViewsPersuasion, traitWeightViewsTrust, traitWeightConversationBelieveClaim and traitWeightSpeechRetell at the general weight 1 (recount first; some have been fitted since the Oct 24 count), and data/research/trait-effect-sizes.json has no row for them.

**Fix.** Recount which of these still sit at weight 1, add the research rows with quotes from the pages the Oct 24 research pass fetched (re-fetch to quote), and fit each weight with scripts/traits/trait-calibrate.ts on a played year; a decision that cannot be fitted keeps its gap row with numbers. Party joining (parties.join) stays with traits-civic-calibrations-studies.

**Time box.** 4 hours for one Sonnet session.

**Rules.** Researching a weight is not deciding a person's act: the weight sizes a weighed reason. Research before building: every row quotes the fetched page and each weight cites its row; a proxy outcome says so.

**Done when.** A second session sees that party attending, group membership, following the news, persuasion, trust, believing a claim and retelling each carry a cited research row with a fitted ESTIMATED weight in src/core2/data/parameters.json, or a gap row in data/content/trait-decision-gaps.json with numbers, as measured by scripts/traits/trait-calibrate.ts in two drawn places (seeds named), one played year of buildBenchWorld each.

**Waits on.** Nothing.

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, data/content/trait-decision-gaps.json, scripts/traits/trait-calibrate.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have fitted temperament weights to fetched studies; precision no player sees.
