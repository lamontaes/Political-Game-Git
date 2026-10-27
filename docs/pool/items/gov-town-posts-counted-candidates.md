---
id: gov-town-posts-counted-candidates
title: "A small town fills its department posts from all its adults, not only the full people"
area: gov
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** At the opening, fillTownPost (src/core2/modules/executive.ts, townPostInput) draws a department head only from the town's full people (peopleByPlace), less sitting officials, heads already named and anyone who worked that day. In a two-level world a small town has few full people, so posts go empty: in place 3812060 (buildBenchWorld seed d6aed6c1ceaf, January 20, 2025) the mayor weighed all 8 posts and filled 2 (city administrator, police chief; 2 candidates, then 1, then 0), leaving fire chief, finance director, public works, planning, city attorney and city clerk empty. The counted residents are adults of the same town who could hold the post.

**Rules.** One model, two tiers: a counted adult is a candidate by the same reasons as a full one (alignment, qualification, acquaintance), times its weight, and is filled in when named (seeded, matching its record). No dice. One rule, all 56 places: test a drawn place, seed named.

**Done when.** In one buildBenchWorld of a small drawn place, seed named, every department post the town's form names is filled at the opening or the record names why no adult could take it, and a counted resident named to a post is filled in with the job and pay the post's record shows, by record id.

**Files.** src/core2/modules/executive.ts, src/core2/executive.test.ts

**Notes.** Filed Oct 25 by the traits lead while counting the opening's appointment weighings (traits-audit-opening-appointments).

Duplicate of gov-appointments-weigh-counted-adults (Oct 25 audit). Same seam: townPostInput in executive.ts reads full people only.
