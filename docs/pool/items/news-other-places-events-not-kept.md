---
id: news-other-places-events-not-kept
title: "M1-13: other states' monthly jobs reports are emitted but never kept, so news can't carry them"
area: world
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In a played year of Dewey Beach, Delaware (place key 1020900, seed 8dc5ab39afc8614e5bd07ce55e2928c003d310c3b9981c71b90843bc8e7c60e8) the regional engine emitted 728 public state jobs reports (src/core2/modules/regional.ts stepRegional), each with a place and date, but none was kept in the durable log the news reads: retainLog (src/core2/state.ts:681) keeps a public record only for a place in visiblePlaceIds, and state:<USPS> places are not visible. So other places' public events are not recorded where news (M2-09) can carry them. Roadmap M1-13's events clause cannot pass until they are kept where the news reads them.

**Rules.** An effect is a read, not a record: a public event elsewhere is kept only where a reader (the news) reads it, and is read. Speed: keep what the news can carry, not every event in the world.

**Done when.** In a played year of a place drawn from all 56, other states' monthly jobs reports are kept where the news reads them and at least one becomes a story the player's town can see, by record id; the M1-13 command's events clause passes, named with place and seed in the PR body. **On screen.** Nothing yet: filed play-other-states-news-on-screen, which puts it on News.

**Files.** src/core2/modules/regional.ts, src/core2/state.ts

**Notes.** Found by the M0-M2 lead writing M1-13's command, Oct 24. Blocks roadmap M1-13.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, replaced. Owner, Nov 5, 12:49 p.m. (OWNER-DECISIONS.md): "you dont need to do a whole huge record keeping thing. just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand". docs/design/country-tier.md makes a state counts and a ledger whose national and state figures every screen reads, so news should read the tier's monthly figures on demand, not 728 kept jobs-report events per year.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): replaced by a design or ruling (named in the Notes above).
