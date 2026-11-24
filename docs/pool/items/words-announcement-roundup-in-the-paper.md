---
id: words-announcement-roundup-in-the-paper
title: "The local paper notices who announces or files, modestly, as a roundup composed from the records"
area: words
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: fable
effort: high
root: none
source: owner, Nov 17, 21:10Z, verbatim on #9750 ("maybe the paper can announce, Shively Johnson and 3 others file for mayoral race or something like that"); the CTO's note of 21:04Z
---

**What.** Nothing in the paper notices that people announce or file for a race. The owner wants a modest roundup: a short item that names one person and counts the rest, growing with how much the race and the people matter, and a small race appearing only in the filing-deadline roundup. His wording is an example, not a template.
Seen: the owner's words of 21:10Z on #9750.

**Cause.** Design: the owner's ruling of Nov 17, 2026 (docs/coordination/OWNER-DECISIONS.md, Nov 17, and his words on #9750). The press desk (src/core2/press-desk.ts) has no story kind for announcements or filings, and the headline and news banks have no roundup composed from several filing records at once.

**Fix.** A press-desk story kind read from the `candidate-announced` (#10013) and filing records of one race: the desk weighs it by the race (an open executive seat, a crowded field) and the people (a known name, an officeholder), prints one roundup item when the weight carries, names the one weighed highest and counts the rest, and otherwise waits for the filing-deadline roundup every race gets. Every line composed by the English engine from those records (the headline and news banks with inserts: the name, the office, the count as words). Proof by story kind at two drawn places, per the press-desk-reach skill.

**Time box.** 6 hours, the Story lead at high, with a Sonnet helper for the desk's weight.

**Rules.** An effect is a read: the roundup reads the announcement and filing records, keeps nothing of its own. No hand-written player text in code: the roundup's lines are bank pieces with inserts. Research calibrates: how often local papers run such items is read, never decides one story.

**Done when.** A second session, in a drawn place on main, announces for a council race and sees no item until the filing deadline's roundup, then announces for an open mayor's seat in a second drawn place and sees the roundup name one candidate and count the rest within the week, each line traced to its records in dev mode.

**Waits on.** #10013 on main; story-announcing-ways-in for the records with real names to count.

**Files.** src/core2/press-desk.ts, src/english/english-newscast.ts, data/english/parts/headlines.json, data/english/parts/news.json

**Notes.**
