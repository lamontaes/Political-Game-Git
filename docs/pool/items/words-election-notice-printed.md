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
checked: fable 2026-11-11
branch: claude/pool-words-election-notice-printed
---

**What.** The notice of election the owner graded good ("NOTICE OF ELECTION NOTICE IS HEREBY GIVEN that an election will be held in {place} on {date} for the following Officers: {office}.") sits in data/english/parts/notice.json under stopgap SG-WORDS-notice-no-reader. No engine prints it: the filing visit has no notice and the paper prints no election notice. Print it in the newspaper before each election from the contest records, as a real town's paper does. Seen: the town paper, which prints a notice of the election before each election day.

**Cause.** Found in code: data/english/parts/notice.json holds notice.election.notice-of-election and src/director/data/stopgaps.json (line 652) holds SG-WORDS-notice-no-reader; nothing prints it, since src/bench/printed-words.ts has no election notice.

**Fix.** Three pieces, in this order. (1) A public notice record: write one from each contest some days before election day (its place, date, office titles and the filing place the records give) in src/core2/modules/elections.ts, where `candidate-filed` is written today (about line 1268), so the press wire has something to print; the number of days is a tagged parameter. (2) A builder `election-notice` in `BUILDERS` in src/bench/printed-words.ts (about line 3300; compare `filing` at line 1501), filling `place`, `date` and `office` from that record. (3) Reach the bank piece `notice.election.notice-of-election` from the builder: read how `story()` and the printed bank loader find a piece first, and route through them, never a second loader. Then add the test beside src/bench/printed-words.test.ts (a one-year run in a drawn place; the notice appears before an election day, by contest record id) and delete SG-WORDS-notice-no-reader and its row. One notice names every office on that day's ballot.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the place, the date and the offices are read from the election's contest records, never typed. One rule, all 56 places: the notice names the filing place the records give. No hand-written player text: the notice is the bank piece notice.election.notice-of-election.

**Done when.** A second session plays a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named) and sees the paper before an election day carry the notice of election naming that election's date and offices by contest record id; a test beside src/bench/printed-words.test.ts proves it, and SG-WORDS-notice-no-reader is deleted.

**Waits on.** Nothing.

**Files.** data/english/parts/notice.json, src/bench/printed-words.ts, src/bench/printed-words.test.ts, src/director/filing-visit.ts, src/director/data/stopgaps.json

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:36 UTC) on branch claude/pool-words-election-notice-printed.

**Notes (Nov 11, 2026, map folded in).** The first builder (#8481) confirmed the cause and found three missing pieces, none on main: no record says an election will be held, no builder prints one, and it did not find how a printed story reaches notice.json. The Fix now names all three. Whether the notice runs as a brief or a story of its own is the words lead's call when the builder asks; build it as one story naming every office until then. No line under data/english/parts/ is written by the builder.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 05:27 UTC) on branch claude/pool-words-election-notice-printed.

Released (2026-11-11): Claimed by my own next loop, not worked: each needs Story-session lines under data/english/parts, a dedicated machine for speed runs, or a rewrite beyond one pass (see my earlier release notes on this item). Continue on branch claude/pool-words-election-notice-printed.

Released (2026-11-11): Read the paper's word path: archived stories reach print through wordArchiveStory/worded in src/bench/archive-words.ts -> composeNewsStory(packet, kind) over the newscast bank, and live stories through printedFacts in src/bench/printed-words.ts; the notice piece sits in its own 'notice' register (data/english/parts/notice.json, move election) that neither path loads, and nothing publishes a notice story per contest. Printing it needs (1) a press/news record written when a contest is posted, (2) the notice register read by the composer, (3) the story on the News tab, in three modules (press, english, bench); not a one-pass change. No lines were written. Continue on branch claude/pool-words-election-notice-printed.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:34 UTC) on branch claude/pool-words-election-notice-printed.

Released (2026-11-11): Cause matches, but no record exists for the paper to print a notice from (no upcoming-election event in press, no notice story kind in english-newscast), so it needs an elections-side record and a Words-reviewed story kind first; not built. Continue on branch claude/pool-words-election-notice-printed.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:35 UTC) on branch claude/pool-words-election-notice-printed.

Released (2026-11-11): Needs an elections-side record the paper can print from and a Words-reviewed notice story kind first; not built. Continue on branch claude/pool-words-election-notice-printed.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:35 UTC) on branch claude/pool-words-election-notice-printed.

Released by next (2026-11-13): no push to claude/pool-words-election-notice-printed since 2026-11-11 02:36 UTC, more than twice its 5-hour time box. Continue on branch claude/pool-words-election-notice-printed.
