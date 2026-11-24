---
id: words-printed-stories-have-a-body
title: "Printed stories have a body: the lede and then sentences the record gives, not only a brief"
lead: words
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: words/printed-bodies-2
pr: #6800
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T19:21:37.381Z
---

**What.** The screens designer (channel, Oct 27) and the CTO's 02:10 relay of the owner's 9 PM findings: News prints briefs today, a headline and one sentence per story. The English engine already composes extra sentences for a story kind that has context roles (the address since Oct 27), but no printed story kind had any, and the archive's words passed only headline and lede. So a story about a new law said only that it took effect, never what it is about or which bill made it.

**Rules.** No hand-written player text: each sentence is a bank piece with slots, filled from the story's record. Ask why: each sentence cites the record. A sentence that only repeats what the lede said is left out.

**Done when.** In a played year of a drawn place, printed law and election stories carry a body of the lede plus one or two sentences the record gives (the law's subject, the bill it came from, the race's opponent); News prints them; printed-words.test.ts fails when no printed story in the year has a body or a body repeats a sentence.

**Files.** src/english/english-newscast.ts, src/bench/archive-words.ts, src/bench/printed-words.ts, data/english/parts/news.json, src/bench/printed-words.test.ts

**Notes.** Filed by the words lead on Oct 28.

Stopped Oct 28, 02:55 UTC on the owner's stop order (relayed by the CTO). Built and pushed on branch words/printed-paragraphs (head 3462996f39): law and election stories get body sentences from their records, and printed-words.test.ts checks them in a played year. No PR opened; claiming this item takes that branch.
