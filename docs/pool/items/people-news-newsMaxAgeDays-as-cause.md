---
id: people-news-newsMaxAgeDays-as-cause
title: "News: a story's life is a cutoff, not a cause"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The news engine reads newsMaxAgeDays (30 days, TUNABLE) as a hard cutoff in three places: a reader whose delivery delay is longer never hears a story (scheduleDeliveries and past-news heardOn skip them), a story older than it is never told at a contact, and forgetOldNews drops who heard it. A reader at engagement 0.03 hears on day 31 or never, with nothing in their life or the story deciding it. Research for research-gov-sourced-parameters found no measured figure that can stand for a cutoff, so the row stays TUNABLE until the engine reads a cause instead: how much the story still matters to the reader (its topic against their concerns, a follow-up story, people still talking about it) fading along a sliding scale.

**Rules.** Sliding scales and causes: nothing flips at a threshold, so a story must fade from news by how much it still touches each reader and town, never stop for everyone on day 31. No dice applies too: the fade must come from the reader's own interests and the story's follow-ups, not a draw.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR), a story's last delivery and last telling come from a recorded cause (its topic's weight to that reader, or a follow-up story by record id), no reader is skipped because of a fixed day count, and src/core2/news.test.ts covers a reader who still hears an old story that keeps mattering to them.

**Files.** src/core2/modules/news.ts, src/core2/past-news.ts, src/core2/data/news/parameters.json

**Notes.** TODO
