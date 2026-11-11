---
id: people-news-newsMaxAgeDays-as-cause
title: "News: a story's life is a cutoff, not a cause"
area: people
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: opus
effort: medium
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** The news engine reads newsMaxAgeDays (30 days, TUNABLE) as a hard cutoff in three places: a reader whose delivery delay is longer never hears a story, a story older than it is never told at a contact, and forgetOldNews drops who heard it. A reader at engagement 0.03 hears on day 31 or never, with nothing in their life or the story deciding it. Research found no measured figure that can stand for a cutoff, so the row stays TUNABLE until the engine reads a cause instead.

**Cause.** Found in code: src/core2/modules/news.ts reads newsMaxAgeDays as a hard cutoff (lines 458 to 461, 505 and 522).

**Fix.** Replace the 30-day cutoff with how much a story still touches each reader and town (its topic against their concerns, follow-up stories, people still talking about it), fading on a sliding scale.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: nothing flips at a threshold, so a story must fade from news by how much it still touches each reader and town, never stop for everyone on day 31. No dice: the fade must come from the reader's own interests and the story's follow-ups, not a draw.

**Done when.** A second session runs a one-year buildBenchWorld in a drawn place from all 56 (seed named in the PR) and sees a story's last delivery and last telling come from a recorded cause (its topic's weight to that reader, or a follow-up story by record id), and no reader skipped because of a fixed day count; src/core2/news.test.ts covers a reader who still hears an old story that keeps mattering to them.

**Waits on.** Nothing.

**Files.** src/core2/modules/news.ts, src/core2/past-news.ts, src/core2/data/news/parameters.json, src/core2/news.test.ts

**Notes.** TODO

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have replaced a 30-day cutoff on old news with a cause; no source gives a figure and no player can tell the difference.
