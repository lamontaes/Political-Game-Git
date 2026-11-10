---
id: words-paper-and-journal-everyday-life-part-1-race-roundups
title: "Race gifts and endorsements print as one periodic roundup"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on: CTO call between roundups (this part) and outlet memory (words-paper-and-journal-everyday-life-part-2-outlet-memory), not yet ruled
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
source: split from words-paper-and-journal-everyday-life in the pool redo, Nov 10, 2026
standard: 2
---

**What.** A campaign gift or an endorsement is printed as its own story, so one race fills a year's paper with the same context sentence. Print a race's gifts and endorsements as one periodic story (a roundup) instead. The aim is that no sentence repeats more than three times in a year's paper. The roundup should read as one story a reader can skim.

**Cause.** Measured: Lane 3's played-year table (Nov 4, drawPlace purpose printed-words, seeds kinds:0 to kinds:2): in Rote, Pennsylvania (seed kinds:2), "Kayla Pitts is a candidate for Supervisor." printed 56 times and campaign-gift 185 and campaign-endorsed 120 stories printed in one year; each is its own story in src/core2/modules/press.ts, opened by the 2-piece campaign-gift-office context line.

**Fix.** In src/core2/modules/press.ts, gather a race's gifts and endorsements in a period into one roundup story that lists them, worded by new pieces in data/english/parts/news.json (Story writes them); stop printing each as its own story.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: words come from the banks. Wire to the world: the story prints from a record an engine writes, cited by record id. One rule, all 56 places: no place is named in logic. Replace, never layer: the per-gift story is removed in the same change.

**Done when.** A second session, not the builder, replays a played year in Rote, Pennsylvania (seed kinds:2) and in one other drawn place it names and sees one periodic roundup story per race listing its gifts and endorsements by record id, with no sentence printed more than three times in the year's paper; printed-words tests pass.

**Waits on.** The CTO's call between this roundup and the outlet memory of words-paper-and-journal-everyday-life-part-2-outlet-memory; build only the one the CTO names.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, data/english/parts/news.json, src/bench/printed-words.test.ts
