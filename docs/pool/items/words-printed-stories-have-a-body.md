---
id: words-printed-stories-have-a-body
title: "Printed stories have a body: the lede and then sentences the record gives, not only a brief"
area: words
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The screens designer (channel, Oct 27) and the CTO's 02:10 relay of the owner's 9 PM findings: News prints briefs today, a headline and one sentence per story. The English engine already composes extra sentences for a story kind that has context roles (the address since Oct 27), but no printed story kind had any, and the archive's words passed only headline and lede.

**Rules.** No hand-written player text: each sentence is a bank piece with slots, filled from the story's record. Ask why: each sentence cites the record. A sentence that only repeats what the lede said is left out.

**Done when.** In a played year of a drawn place, printed law and election stories carry a body of the lede plus one or two sentences the record gives (the law's subject, the bill it came from, the race's opponent); News prints them; printed-words.test.ts fails when no printed story in the year has a body or a body repeats a sentence.

**Files.** src/english/english-newscast.ts, src/bench/archive-words.ts, src/bench/printed-words.ts, data/english/parts/news.json, src/bench/printed-words.test.ts

**Notes.** Filed by the words lead on Oct 28.
