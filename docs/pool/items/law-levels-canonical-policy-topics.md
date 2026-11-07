---
id: law-levels-canonical-policy-topics
title: "Offer one simulated decision for canonical law aliases"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The shared minimum-wage question and its legacy federal name map to one law record, but the law-level topic predicate still offers both as separate agenda/platform decisions. The combined main year check gains 435 vote rows in year one and misses the 5 percent bar in years 1, 3 and 4. Keep aliases available for manual drafting while enumerating only the canonical decision in the shared law-level filter.

**Rules.** Use the existing policySeriesAtLevel data mapping. Change only the shared law-topic predicate in world-legislating, not campaigns, electorate, views, wage effects or state/local bars. No outcome thresholds or vote preferences change. No replay medians or weakened speed bar.

**Done when.** An unchosen generated-world regression finds no duplicate canonical federal topics, both wage catalog names remain authorized and read one record, and state scope is unchanged. Break-it, ten fresh draws and new game pass. Replay four exclusive years on the same main baseline after the fix; report every year against 5 percent.

**Files.** src/core2/modules/world-legislating.ts,src/core2/canonical-policy-topics.test.ts

**Notes.** Astra follow-up to 7334. Two-hour unit, no helpers. Failed combined head f3d06182ae9b9c42916725c2acfb598d2219b887, Hidden Springs ID replay 4656597f8770bfac: 85.7,162.3,99.9,189.6 seconds versus 81.2,156.2,92.5,174.8. Extra votes are a finding, not yet a proved explanation for the full timing change.
