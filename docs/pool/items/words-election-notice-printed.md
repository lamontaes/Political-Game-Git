---
id: words-election-notice-printed
title: "The clerk or board of elections posts and the paper prints a notice of each election"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at:
checked: fable 2026-11-10
---

**What.** The notice of election the owner graded good ("NOTICE OF ELECTION NOTICE IS HEREBY GIVEN that an election will be held in {place} on {date} for the following Officers: {office}.") sits in data/english/parts/notice.json under stopgap SG-WORDS-notice-no-reader. No engine prints it: the filing visit has no notice and the paper prints no election notice. Print it in the newspaper before each election from the contest records, as a real town's paper does.

**Cause.** Found in code: data/english/parts/notice.json holds notice.election.notice-of-election and src/director/data/stopgaps.json (line 652) holds SG-WORDS-notice-no-reader; nothing prints it, since src/bench/printed-words.ts has no election notice.

**Fix.** Print the notice in the paper before each election from the contest records (place, date, offices, and the filing place the records give), through src/bench/printed-words.ts; then delete SG-WORDS-notice-no-reader.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Wire to the world: the place, the date and the offices are read from the election's contest records, never typed. One rule, all 56 places: the notice names the filing place the records give. No hand-written player text: the notice is the bank piece notice.election.notice-of-election.

**Done when.** A second session plays a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named) and sees the paper before an election day carry the notice of election naming that election's date and offices by contest record id; a test beside src/bench/printed-words.test.ts proves it, and SG-WORDS-notice-no-reader is deleted.

**Waits on.** Nothing.

**Files.** data/english/parts/notice.json, src/bench/printed-words.ts, src/bench/printed-words.test.ts, src/director/filing-visit.ts, src/director/data/stopgaps.json

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.
