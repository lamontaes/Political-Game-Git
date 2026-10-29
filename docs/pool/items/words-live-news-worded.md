---
id: words-live-news-worded
title: "Every story the press prints reaches News worded by the English engine, never as a bare record"
area: words
kind: feature
priority: 1
size: M
status: done
claimed-by:
pr: #6213
blocked-on:
source: "words-and-scenes work order, deliverable 4 (docs/work-orders/lead-words-scenes-2026-10-26.md), from the owner's Oct 26 playtest"
lead: words
milestone: play-first
claimed-at:
---

**What.** News words only stories the press archived before day one (`wordArchiveStory` in `src/bench/archive-words.ts`). Every story printed during play (`press.printed`) reaches News with no headline or lede, so it falls into the public-records box as a record kind and a list of labeled fields. In a year of Red Hook, U.S. Virgin Islands (seed `news-a`), the press printed 33 kinds of story: laws taking effect, signed bills, jobs reports, closings, charges, filings, debates and more. None of them had words. The trace audit's "entered the world" records (`person.recorded`, `organization.recorded`) were also printed as news, so the two-level population's fill-in showed up as a story.

**Rules.** Serves LAW.md §6, News: no hand-written player text, so every printed story is composed by `composeNewsStory` from authored bank pieces (`origin: authored`) with record facts in their slots. One rule, all 56 places: the wording reads the record, so it never names a place. An effect is a read: the headline and lede cite the printed story's record id and the source record's id.

**Done when.** A test in a played world (buildBenchWorld, a drawn place from all 56, seed printed) runs a year and asserts that every printed story a resident heard has a bank-composed headline or lede citing its record id. A second test in a drawn Ohio place finds the minimum wage law change and its worded story by record id. Bench screenshot of News at 1440x900 with place and seed.

**Time box.** 4 hours.

**You will see.** News lists each story the town's papers and stations printed as a headline and a first sentence in plain English (who signed what, what took effect, who was charged), never a record kind or a row of labeled fields.

**Screenshot.** News, before and after, from a drawn place at 1440x900, in the PR body.

**Files.** src/bench/archive-words.ts, src/bench/calendar.ts, src/english/english-newscast.ts, data/english/parts/headlines.json, data/english/parts/news.json, src/core2/press-topics.ts

**Notes.** Found by the words-and-scenes lead, Oct 27 (deliverable 4).
Sent back Oct 27 from PR #6213 (branch words/live-news-worded): printed-words test leaves cause-group.ad stories unworded in New Hope, Virginia (seed e344a94c...); finish on that branch, merge main into it first.
