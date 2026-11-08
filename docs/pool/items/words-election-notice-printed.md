---
id: words-election-notice-printed
title: "The clerk or board of elections posts and the paper prints a notice of each election"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at:
---

**What.** The notice of election the owner graded good ("NOTICE OF ELECTION NOTICE IS HEREBY GIVEN that an election will be held in {place} on {date} for the following Officers: {office}.") sits in data/english/parts/notice.json under stopgap SG-WORDS-notice-no-reader. No engine prints it: the filing visit has no notice and the paper prints no election notice. Print it in the newspaper before each election from the contest records, as a real town's paper does.

**Time box.** Three hours for one Sonnet session.

**Rules.** Wire to the world: the place, the date and the offices are read from the election's contest records, never typed. One rule, all 56 places: the notice names the filing place the records give. No hand-written player text: the notice is the bank piece notice.election.notice-of-election.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56, named with its seed, the paper before an election day carries the notice of election naming that election's date and offices by contest record id; a test beside src/bench/printed-words.test.ts proves it. Then delete SG-WORDS-notice-no-reader.

**Files.** data/english/parts/notice.json, src/director/filing-visit.ts, src/bench/printed-words.ts, src/bench/printed-words.test.ts

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.
