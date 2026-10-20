---
id: gov-past-closures-archive
title: "Business closures from the year before day one are archived news, generated from the business engine's past"
area: gov
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-yucp92-oo
pr: #5072
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:41:24.521Z
---

**What.** The news archive reports the year before day one but carries no business closures, because the generated past holds none: businesses start on day one. Generate the closures of the town's businesses in that year from the business engine's own past, as records with the owner, the workers and the date. Carry them into the archive so a shop that closed last year is in the news history and the people it employed remember it.

**Rules.** No dice: a closure comes from a business's books, its owner's reasons and the market, never a roll or a fixed percentage. Ask why: each archived story keeps the closure record it came from. One model, two tiers: a counted business closing is archived at counted level and filled in when the player meets it.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a drawn place and a seed the builder did not choose, the opening's archive lists at least one business closure dated before day one with its record id, and the stopgap SG-CORE-past-no-deaths-closures is resolved. A test in src/core2 names the place, the seed and the closure record.

**Files.** src/core2/past-news.ts, src/core2/modules/business.ts, src/core2/past-business.ts, src/core2/data/stopgaps.json

**Notes.** Sent back Oct 20 from PR #5072 (branch claude/past-business-closures): diff contained unrelated edits under src/director/ and data/english/ outside the government area; finish on that branch, merge main into it first.

Split from gov-past-deaths-closures-archive (the deaths half is built there). The deaths come from the kin generator's life-table line; closures need a business history the generator does not yet keep.
