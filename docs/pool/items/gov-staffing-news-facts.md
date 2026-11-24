---
id: gov-staffing-news-facts
title: "A printed story keeps the facts of the public record it came from"
area: gov
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/staffing-news-facts-s5
pr: #4845
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T00:06:11.798Z
---

**What.** A wire item drops the facts of the public record it came from, so a printed story cannot tell a reader why (a layoff record's employer, jobs lost, sales and costs). Retain the record's facts on the wire item (`WireItem.facts` in `src/core2/press-topics.ts`) and carry them, with `sourceRecordId`, onto the printed story's facts in `printItem` (`src/core2/press-desk.ts`), so the news a reader hears holds the record's own facts and no one else's. The Play half (showing them on the Politics-news sheet) is `play-staffing-news-sales-costs`.

**Rules.** An effect is a read, not a record: the news a reader hears is read by the sheet and the views. Facts reach only readers who hear the story (a non-reader hears nothing). Replace, never layer: the generic facts row stays for every other kind of record.

**Done when.** In a test over the played pieces (and, in a one-year run of the played world in a drawn place, a layoff in the news) a printed story's saved facts hold the wire item's facts and its source record id, delivered only to a reader; `src/core2/press-public-facts.test.ts` covers the wire item and the printed story.

**Files.** src/core2/press-topics.ts, src/core2/press-desk.ts, src/core2/press-public-facts.test.ts

**Notes.** The finished code and its test are in commit 5081de743c on branch claude/world-layoffs-proof (PR #4591), split out by the merger; the revert that removed them is b0dc052987, so `git diff b0dc052987 b0dc052987^ -- <those three files>` reapplies them.
