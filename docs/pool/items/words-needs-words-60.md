---
id: words-needs-words-60
title: "Needs from other sessions listed in words.md (line 60): 30 lines"
area: words
kind: wiring
priority: 2
status: done
claimed-by: claude/words-needs-words-60
pr: #4564
blocked-on: "core-year-crash-outside-obligation, core-year-crash-public-pay-work-obligation, core-year-crash-standing-obligation-end, core-year-crash-job-end-before-work, core-opening-no-17-year-old, people-minor-left-alone, core-president-address-news, director-conversation-defects, play-state-of-union-picture"
milestone:
source: 'docs/coordination/words.md "Needs from other sessions" (line 60)'
claimed-at: 2026-10-16T03:03:44.289Z
---

**What.** This item holds 30 requests from the Words session to others, mixing crashes found by the grading batch (a played year stopping on a finance contract, public pay, an obligation or a job end in drawn places; a small place with no 17-year-old; the President's address not carried as news), wiring of the mined banks (`MINED_WORDS` for conversation, journal, scene, bring-it-up, speech, news, choice names, opening speech), and director logic defects (a player offered the line he just said, conversations that ask too much, a repeated work line). Walk the lines in order, verify each against main, close the built ones with a commit, and split each unbuilt one into its own small pool item. The player would notice the banks reaching play and fewer crashed years.

**Rules.** Look before you ask: search docs/, the register and the pool first; closes SG-P15-*-banks rows only where code now reads the bank; Wire to the world: a bank line closes only when the director or a screen reads it in a played year, by record id; An effect is a read, not a record: a bank nobody reads is a placeholder; No hand-written player text: no words are typed into code to close a line; One rule, all 56 places: repro places are only repros; fixes read data for all 56 places; Placeholders: SG-P15-conversation-banks, -journal-banks, -scene-banks and -bring-it-up-banks close only when read; Speed: crash fixes keep a year under two minutes.

**Done when.** Every one of the 30 lines in `docs/coordination/words.md` (line 60) is struck with a commit or has a pool item id, the four SG-P15 bank rows are closed or narrowed with reasons, and a drawn place and seed (named) plays a year with the banks read (conversation, journal, scene and bring-it-up line ids named). Check by `npm run pool -- --check` and the English bank tests. The owner plays it: talks, reads the journal and sees scenes all in the mined words.

**Files.** docs/coordination/words.md, scripts/english-corpus/index.ts, src/director/mined/, src/director/scene.ts, src/core2/data/stopgaps.json

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Triage (Oct 16, checked against main).**

- The four bank rows are closed already: SG-P15-conversation-banks, -journal-banks, -scene-banks, -filing-visit-banks and -bring-it-up-banks are resolved in stopgaps.json, and `src/director/mined/` holds a bank loader for each.
- Crashes found by the grading batch, now bug items with their repro: `core-year-crash-outside-obligation` (Wakonda), `core-year-crash-public-pay-work-obligation` (scenes-c), `core-year-crash-standing-obligation-end` (Waterford), `core-year-crash-job-end-before-work` (Northchase), `core-opening-no-17-year-old` (Utica, Buffalo Prairie), `people-minor-left-alone` (Richland).
- The President's address as news: `core-president-address-news`. The State of the Union's picture: `play-state-of-union-picture`. A local bill with no title: fixed by the bill-title PR (every bill has a section).
- Conversation logic defects (offered the line just said, echoed sightings, a repeated work line, asking too much): `director-conversation-defects`.
- A divorce producer, the choice names on the bench, the news and TV composers, the opening speech and the office counter wiring are their own tracked items or are built (`composeOpeningSpeech` is in src/english); they are not repeated here.
- Not mine to rule: the San Diego notices (public-domain question) is an owner decision and is recorded in the Words session's notes.
