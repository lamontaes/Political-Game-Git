---
id: gov-stopgap-past-news-missing-record
title: "Stopgaps in past-news (missing-record): 2 open"
area: gov
kind: stopgap
priority: 2
status: done
claimed-by: claude/past-news-outlet
pr: #4559
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/past-news.ts, kind missing-record"
claimed-at: 2026-10-16T02:50:16.242Z
---

**What.** The news archive (`past-news.ts`) carries elections, laws, votes and budgets from the year before day one, but it lacks deaths and business closures (SG-CORE-past-no-deaths-closures) and writes stories under an 'archive:' kind of its own on the news module's shape (SG-CORE-past-archive-kind) instead of the press engine's own archive kind. Generate the deaths of the circle's relatives and the closures of the town's businesses in the year before day one as records, carry them into the archive, and have the press engine write the archive stories through its own writer. The player would notice a past that includes a neighbor's passing and a shop that closed, and one list of outlets.

**Rules.** Replace, never layer: the 'archive:' kind and the old news module's `outlets` write are deleted in the same change, so there is one list of outlets; An effect is a read, not a record: the archive stories are read by the press, the journal and bring-it-up; No dice: deaths and closures come from the deep-past and business records for people and businesses that existed, never a roll to invent them; Ask why: each archived story keeps the record it came from; One model, two tiers: counted deaths and closures are archived at counted level and filled in when the player meets them; Placeholders: both rows close only when the records exist; One rule, all 56 places: no place named in code; Speed: the past is generated once at the opening, not rescanned daily.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the opening's archive for the drawn town lists at least one death and one closure dated before day one with their record ids, the stories are written through the press writer, and `past-news.ts` writes no 'archive:' kinds; both rows close. Tests beside `src/core2/past-news.test.ts` (new). The owner plays it: opens News history on day one and reads a closure and a death from last year.

**Files.** src/core2/past-news.ts, src/core2/modules/press.ts, src/core2/modules/news.ts, src/core2/data/past, src/core2/data/stopgaps.json

**Notes.** First row: Archive stories use kinds prefixed 'archive:' in the news engine's story shape, and keep their facts on the story with a pointer in the reader's knowledge.

**Split (Oct 16).** This item now covers one list of outlets: the archive is carried by the town paper from the press's list, and the news engine's stand-in outlets table is deleted (test in `src/core2/past.test.ts`). Deaths and closures before day one, and the press writer for archive stories, moved to `gov-past-deaths-closures-archive`, which keeps both stopgap rows open.
