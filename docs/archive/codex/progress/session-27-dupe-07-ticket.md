# Session 27 duplicate ticket DUPE-07: campaign contribution rules and winner seating

**State:** open on current main `5e3238b`.

Campaign creation makes a jurisdiction-specific compliance decision in `src/simulation/campaigns.ts:881-885` by comparing the home jurisdiction to `US-KY` and copying the pack ID. The reviewed Kentucky pack and campaign eligibility check are separately implemented in `src/simulation/campaign-compliance.ts:198-248`. Make campaign pack selection a single data-backed resolver and route every contribution path through that result; keep unsupported jurisdictions explicitly unknown.

Winner seating has an election-result router at `src/simulation/campaigns.ts:1798-1820`, a separate local-body writer at `:1936-1949`, and county row-officer seat creation at `src/simulation/living-world/local-government-seats.ts:701-760`. Trace overlapping winner/term/participation writes, retain distinct office requirements as body rules, and leave one canonical writer per office class.
