---
id: gov-past-deaths-closures-archive
title: "The year before day one has deaths and closures, written through the press writer"
area: gov
kind: feature
priority: 2
status: done
claimed-by: claude/gov-past-deaths-closures-archive
pr: #4760
blocked-on:
milestone:
source: "split from gov-stopgap-past-news-missing-record; SG-CORE-past-archive-kind, SG-CORE-past-no-deaths-closures"
claimed-at: 2026-10-16T15:19:08.888Z
---

**What.** The news archive carries elections, laws, votes and budgets from the year before day one, but no deaths and no business closures, and it writes stories under an archive kind of its own on the news module's shape instead of the press engine's writer. Generate the deaths of the circle's relatives and the closures of the town's businesses in that year as records from the deep past and the business engine, carry them into the archive, and have the press write the archive stories. The player would notice a neighbor's passing and a shop that closed.

**Rules.** No dice: deaths and closures come from the deep-past and business records for people and businesses that existed. Ask why: each archived story keeps the record it came from. One model, two tiers: counted deaths and closures are archived at counted level and filled in when the player meets them. Replace, never layer: the archive kind is deleted in the same change. Placeholders: both rows close only when the records exist. One rule, all 56 places. Speed: the past is generated once at the opening.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the opening's archive lists at least one death and one closure dated before day one with their record ids, the stories are written through the press writer, and past-news.ts writes no archive kinds; both stopgap rows close. The owner plays it: opens News history on day one and reads a closure and a death from last year.

**Files.** src/core2/past-news.ts, src/core2/modules/press.ts, src/core2/modules/news.ts, src/core2/data/stopgaps.json

**Notes.** Split Oct 16: this PR builds the deaths of residents' parents in the year before day one, from the kin generator's life-table line, as dated family facts on the survivors and archive stories. Business closures are gov-past-closures-archive; the press engine's own archive kind is gov-past-archive-press-writer. Counted residents' parents' deaths are not archived yet (stopgap SG-CORE-past-no-deaths-closures keeps that).
