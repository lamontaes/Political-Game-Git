---
id: words-scene-narration-scene-words-json-then-people
title: "Scene narration (scene-words.json), then people bringing things up (bring-it-up.json), then news hea"
area: words
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/words.md line 34 (unchecked checklist line)"
---

**What.** Scene narration is thin: `data/english/parts/scene-words.json` has few setting lines, `bring-it-up.json` lacks the rows for many subjects, and news headlines and the names of choices, stance questions and actions still show as record keys (the News screen reads 'election-result · office: Commissioner · winner: ...'). Mine and author scene narration first, then the bring-it-up rows, then headlines (from `headlines.json` and `news.json`) and choice names, and have composeScene, bringItUp and the news writer read them. The player would notice scenes that describe where he is, neighbors who bring things up and headlines instead of keys.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); An effect is a read, not a record: the scene composer, bringItUp and the news writer read the banks at the moment they render; a bank no engine reads does not count; Ask why: each narration line and headline cites the record it reports; No dice: the director picks lines from the situation and traits, not a roll; Replace, never layer: key-printing fallbacks are deleted; One rule, all 56 places: no place or person named in parts; Research before building: mined lines are public domain with the source recorded.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the News screen and a scene show worded headlines and narration for stories and scenes in the year (story and scene ids named) with no record keys visible, `sceneWordsFromBank`, `bringDataFromBank` and `composeNewsStory` are called by the game code, and the lines are composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. Tests in `src/director/mined/scene-bank.test.ts` and `scripts/english-corpus/newscast-bank.test.ts`. The owner plays it: reads the News screen and sees headlines.

**Files.** data/english/parts/scene-words.json, data/english/parts/bring-it-up.json, data/english/parts/headlines.json, src/director/mined/scene-bank.ts, scripts/english-corpus/newscast-bank.ts

**Notes.** Checklist line from words.md; verify against main before starting.
