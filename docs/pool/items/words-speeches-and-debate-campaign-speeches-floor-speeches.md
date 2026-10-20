---
id: words-speeches-and-debate-campaign-speeches-floor-speeches
title: "Speeches and debate (campaign speeches, floor speeches, public comment), then interviews (with GOV's"
area: words
kind: feature
priority: 2
status: in-pr
claimed-by: claude/political-game-pool-7xkkii
pr: #5196
blocked-on:
milestone:
source: "docs/coordination/words.md line 37 (unchecked checklist line)"
claimed-at: 2026-10-19T22:19:00.484Z
---

**What.** Campaign speeches, floor speeches, public comment and interviews have registers and a bank (`data/english/parts/address.json`, `interview.json`, `hearing.json`) but no full path from the player's choices to what is said at each venue. Build the speech parts for each register (house-floor, senate-floor, state-floor, hearing, public-comment, chair, campaign, victory, concession) and the debate and interview exchange, with the part chosen from the speaker's record and positions. The player would notice a floor speech that sounds like a floor speech and a concession that sounds like a concession.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); An effect is a read, not a record: `giveSpeech` and the interview read the register and the speaker's positions at the moment they compose; Ask why: each part cites the move and the position or record it voices; No dice: a speaker's tone follows their traits and the situation, not a roll; Look before you ask: the Suzerain ruling (short openers and closers, longer meaty body choices) is in OWNER-DECISIONS.md; quote it; Research before building: mined sentences are public domain with the source kept; One rule, all 56 places: no place or person named; Replace, never layer: no hand-built speech string is kept.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a campaign speech, a floor speech and a public comment delivered in the year each compose from the right register's parts (speech and part ids named) and are composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. Tests in `scripts/english-corpus/address-bank.test.ts` and `src/core2/speech-composition.test.ts`. The owner plays it: speaks at a council hearing and hears the register.

**Files.** data/english/parts/address.json, scripts/english-corpus/address-bank.ts, src/core2/speech-composition.ts, src/core2/modules/speech.ts

**Notes.** Checklist line from words.md; verify against main before starting.
