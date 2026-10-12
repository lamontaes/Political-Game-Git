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

- [ ] **Conversations for steps 1 and 2** (`conversation.json` stopgap `SG-P15-conversation-banks`): greetings, asking after family, work, school and news, answering, raising a real subject, leaving, and the lie.
- [ ] **The clerk at filing** (`filing-visit.json`, `SG-P15-filing-visit-banks`): how real clerks explain rules, fees, signatures and deadlines.
- [ ] **The journal** (`journal.json`, `SG-P15-journal-banks`): a first-person life story that names people by relationship and never invents a feeling.
- [ ] **Scene narration** (`scene-words.json`), then **people bringing things up** (`bring-it-up.json`), then news headlines and the names of choices, stance questions and actions still shown as record keys.
- [ ] **Speeches and debate** (campaign speeches, floor speeches, public comment), then **interviews** (with GOV's press interviews).

## Needs from other sessions

- (none yet)

## Questions for the owner

- (none yet)

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12: started. Branch `opus-words` from `pool/P15-people-5` with `main` merged in. Wrote the shape miner (`scripts/english-corpus/mine-shapes.py`): a candidate sentence with slots is kept when two documents say it whole and one is a public-domain federal record from 2015 on, which becomes its source. Building the raw corpus outside the repo (hearings, the Congressional Record, NASA and House oral histories, the WPA life histories). Next: mine the conversation bank.
