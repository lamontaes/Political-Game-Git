# OPUS-WORDS: The English engine's phrase banks

Only OPUS-WORDS writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** The data the English engine composes from: `data/english/parts/**`, `data/english/counts/**`, the corpus tooling in `scripts/english-corpus/**` and the research notes in `docs/research/english-corpus/**`. OPUS-PEOPLE owns the engine itself (`src/presentation/english-*.ts`, the `*-english.ts` writers, `src/director/**`).
- **Branch:** `opus-words`, from `pool/P15-people-5` with `main` merged in; `pool/P15-people-5` is merged in whenever it moves.
- **Model:** Opus, high: choosing which real sentences carry each conversation move is judgment work.
- **Starts from:** The owner's approval, Oct 12 at 10:20 a.m.; PEOPLE's Words item (`docs/coordination/people.md`); the speech corpus research (`docs/research/speech-and-dialogue-corpus-2026-09-28.md`); the existing mined banks in `data/english/parts/`.

## What the owner can play now

- Nothing new on screen yet. The conversation, filing, journal, scene and bring-it-up words still come from PEOPLE's five hand-written template banks (registered stopgaps) until PEOPLE switches each one to the mined banks listed below.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [x] **Conversations for steps 1 and 2** (`conversation.json` stopgap `SG-P15-conversation-banks`): greetings, asking after family, work, school and news, answering, raising a real subject, leaving, and the lie.
  - First version Oct 12: `data/english/parts/conversation.json`, 226 sentences from 2,500 public-domain transcripts, each with its source, date, address and license. `scripts/english-corpus/conversation-bank.ts` turns it into the director's conversation data, and `conversation-bank.test.ts` runs the director's own `openConversation` and `say` with it in a generated place: every line and choice is a mined sentence filled from records, with its record ids. A conversation now reads: "What are you doing now?" / "I work at Petty Cleaning. What about you?" / "Do you know Kristen Sandoval?"
  - Grading: `docs/grading/words-batch-3.md` (100 lines from 6 drawn places, one axis: does it fit the line before it), from `data/english/batches/batch-3.json`; the owner's grades go in `data/english/grades/batch-3.json` and fold in with `scripts/dialogue-batch/apply-grades.ts`. The adapter already skips parts the grades hold back.
  - Still unworded (no record says them twice yet): asking whether someone is still at their work or still in town, raising a past workplace, "I saw {name} on {when}.", and the "lives with me" answer. The director leaves those subjects unasked until the corpus covers them.
- [ ] **The clerk at filing** (`filing-visit.json`, `SG-P15-filing-visit-banks`): how real clerks explain rules, fees, signatures and deadlines.
- [ ] **The journal** (`journal.json`, `SG-P15-journal-banks`): a first-person life story that names people by relationship and never invents a feeling.
  - First version Oct 12: `data/english/parts/journal.json` (about 40 sentences people said about their own lives), `scripts/english-corpus/journal-bank.ts` maps each to the director's journal row, and `journal-bank.test.ts` writes a life through `composeJournal` in a generated place: every line mined, every record id resolving, no feeling words. Elwood, Kansas reads: "I was at Riverside Primary School. I went on to Riverside Middle School. I went to Riverside High School." then "My son was born. My daughter was born."
  - Still unworded: someone else losing a job, short pay, "I saw {name} three times", the minimum-wage raise and the law taking effect, someone else filing to run. The director leaves those moments out of the journal until the corpus covers them.
- [ ] **Scene narration** (`scene-words.json`), then **people bringing things up** (`bring-it-up.json`), then news headlines and the names of choices, stance questions and actions still shown as record keys.
- [ ] **Speeches and debate** (campaign speeches, floor speeches, public comment), then **interviews** (with GOV's press interviews).

## Needs from other sessions

- **OPUS-PEOPLE (closes `SG-P15-conversation-banks`):** read the director's conversation words from `data/english/parts/conversation.json` through `conversationDataFromBank` in `scripts/english-corpus/conversation-bank.ts` (move it under `src/director/` as you like). Three engine changes make it whole:
  1. An answer choice has several wordings: render each choice from all its variants (the grounded renderer's stable pick) instead of one fixed text. Until then the adapter picks one wording per choice by a stable key.
  2. Slots: the bank writes `{my_employer}`; the director's renderer reads `{{my-employer}}`. The adapter converts them.
  3. Skip a part the owner's grades hold back (`heldByGrades(part.key)`), as `composeFromBank` already does.
- **OPUS-PEOPLE (closes `SG-P15-journal-banks`):** pass `journalDataFromBank()` from `scripts/english-corpus/journal-bank.ts` as the journal's data. No engine change is needed; the relation words, count words and look-back stay the director's own data.
- **OPUS-PEOPLE (filing clerk, `SG-P15-filing-visit-banks`):** no public-domain record has a clerk saying the fee or the signature count, so the clerk's terms line can't be mined yet. Proposal: show the deadline, fee and signatures as record data on the filing screen (labels and values), and let the clerk speak only the mined lines in `data/english/parts/filing-visit.json` (asking which office, the deadline, the age, residency and registration rules, and closing).

## Questions for the owner

- (none yet)

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12: grading batch 3 for the owner (100 conversation lines from Jay, Florida; Ovid and Morrisville, New York; Horatio, Arkansas; Continental Courts, Pennsylvania; Sidney, Montana; 70 distinct mined sentences). Making it fixed two misfits: "Good." after "I haven't seen him", and "Yes, I am." after "Oh, I see." The journal bank now writes whole lives through the director. The Library of Congress blocks the WPA life histories from this cloud (5 of about 2,900 fetched), so everyday talk comes from federal oral histories instead; a helper is adding National Park Service, NIH, FDA, USDA and other NASA centers' oral histories. Next: the clerk through the director, then scenes.

- Oct 12: the conversation bank (226 sentences) and a first clerk bank (18) are mined from 2,850 public-domain documents and pass the bank and era tests; the conversation bank words whole conversations through the director in a generated place. Moved three banks whose sources are not public domain (campaign remarks, court transcripts) to `data/english/patterns/`, and unshipped three Baltimore council parts; the bank tests went from 14 failures to 5 (all in the news-lede and notice banks, which item 4 re-mines). Next: a 100-line grading batch, then the journal.

- Oct 12: started. Branch `opus-words` from `pool/P15-people-5` with `main` merged in. Wrote the shape miner (`scripts/english-corpus/mine-shapes.py`): a candidate sentence with slots is kept when two documents say it whole and one is a public-domain federal record from 2015 on, which becomes its source. Building the raw corpus outside the repo (hearings, the Congressional Record, NASA and House oral histories, the WPA life histories). Next: mine the conversation bank.
