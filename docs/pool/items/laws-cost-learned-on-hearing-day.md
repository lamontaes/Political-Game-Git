---
id: laws-cost-learned-on-hearing-day
title: "A household's payer ties a law's cost to the law only on billing day, so a story heard after the bill, or forgotten before it, moves no one's view"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/laws-cost-learned-on-hearing
pr: #6371
blocked-on:
source: "Split from #5968 (laws-end-to-end-proof) by the per-unit rule (owner, Oct 27)"
claimed-at: 2026-10-27T18:49:21.000Z
---

**What.** The price engine lets a household's payer tie a price change to the law behind it only on the billing day, and only if the law's story is still in the news then (`learnFromStory` in `src/core2/modules/place-prices.ts`, called from billing alone). A payer who hears the story a week after the bill never ties the cost to the law. A payer who heard it before the first bill, after the news engine forgot the story, ties nothing either, because the views engine reads only what a person still knows. So a law's cost reaches fewer people's views than heard of it.

**Rules.** No dice: a person ties the cost to the law because they paid it and heard the story, never by chance. Wire to the world: the learned event cites the story, and the views engine reads it. One rule, all 56 places.

**Done when.** In a buildBenchWorld drawn place with a seed named in the PR body, a payer who hears a law's story after their household's first bill under it learns the same day, and a payer who heard it before a bill the news has since forgotten still learns at the bill with their view moved, each named by record id; the test fails with the change removed.

**Time box.** 2 hours.

**Files.** src/core2/modules/place-prices.ts, src/core2/modules/news.ts, src/core2/place-prices-learned.test.ts

**Notes.** Unit A of #5968, ported to today's main by a helper of the laws-and-effects lead.
