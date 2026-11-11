---
id: words-journal-as-stories
title: "Journal entries for a job found, lost or left are told as small stories (how long, who before, the pay against the old pay), not as statements"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by: story/journal-as-stories
pr: #8118
blocked-on:
lead: words
source: owner batch 3 ("After 2 years out of work, I found work in Lexington" is a statement; "After out of work, I went back to work" breaks; he wants a small story)
claimed-at: 2026-11-10T06:00:00.000Z
merged-at: 2026-11-10T07:18:41.260Z
seen-by: second-session-2
seen-at: 2026-11-11T02:35:31.685Z
---

**What.** A journal row may now name `follow` fields: memoir sentences told after the event, each written only when the record gives the facts its slots name. The past-work moments (job found again after time out of work, first job, job lost, job left for another) now carry how long the job lasted, what it paid an hour as people round it, what the job before paid when the two differ, and the employer before a stretch out of work, all cited to the spell records. Five statement-only event pieces ("After {span} out of work, I ...", "I was out of work for {span} before {employer} took me on", "It was {span} before I found work again, at {employer}") are retired and replaced by event lines that name the employer and follow-on sentences.

**Rules.** No new engine. Each sentence is at most ten words, requires its facts by its slots, and invents no helper or feeling the records lack. No dice.

**Done when.** src/director/journal-work-stories.test.ts plays a drawn world for a year and prints the work entries written, each with its past-work record ids, none of them "After ... out of work"; the English and families guards pass.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, src/english/journal-words.ts, data/english/parts/journal.json, src/director/data/stopgaps.json

**Notes.** Stopgap SG-WORDS-journal-story-no-helper: the past-work spells keep no referral, so no entry says who helped. Other life-event rows (a move, a birth, a school year) can take `follow` fields the same way. Voice read: first-person accounts of finding work after a long stretch out (specific pay, the employer, what changed).

Seen in the game (2026-11-11, second-session-2): drawn test world, seed c5d0ff3600, main 25963514: journal-work-stories.test.ts played a drawn world for a year and passed on a fresh seed, with journal tests and the banks also passing
