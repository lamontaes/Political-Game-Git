---
id: words-scene-narration-scene-words-json-then-people
title: "Scene narration (scene-words.json), then people bringing things up (bring-it-up.json), then news hea"
area: words
kind: feature
priority: 2
status: open
claimed-by:
pr: #5706
blocked-on: words: the merger accepts edits under src/director and data/english only from the Words session; the CTO must confirm a non-Words branch or hand this to the Words line (merger comment, Oct 20)
milestone:
source: "docs/coordination/words.md line 34 (unchecked checklist line)"
claimed-at:
---

**What.** Scene narration is thin: `data/english/parts/scene-words.json` has few setting lines, `bring-it-up.json` lacks the rows for many subjects, and news headlines and the names of choices, stance questions and actions still show as record keys (the News screen reads 'election-result · office: Commissioner · winner: ...'). Mine and author scene narration first, then the bring-it-up rows, then headlines (from `headlines.json` and `news.json`) and choice names, and have composeScene, bringItUp and the news writer read them. The player would notice scenes that describe where he is, neighbors who bring things up and headlines instead of keys.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); An effect is a read, not a record: the scene composer, bringItUp and the news writer read the banks at the moment they render; a bank no engine reads does not count; Ask why: each narration line and headline cites the record it reports; No dice: the director picks lines from the situation and traits, not a roll; Replace, never layer: key-printing fallbacks are deleted; One rule, all 56 places: no place or person named in parts; Research before building: mined lines are public domain with the source recorded.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the News screen and a scene show worded headlines and narration for stories and scenes in the year (story and scene ids named) with no record keys visible, `sceneWordsFromBank`, `bringDataFromBank` and `composeNewsStory` are called by the game code, and the lines are composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. Tests in `src/director/mined/scene-bank.test.ts` and `scripts/english-corpus/newscast-bank.test.ts`. The owner plays it: reads the News screen and sees headlines.

**Files.** data/english/parts/scene-words.json, data/english/parts/bring-it-up.json, data/english/parts/headlines.json, src/director/mined/scene-bank.ts, scripts/english-corpus/newscast-bank.ts

**Notes.** Sent back 2026-10-20 from PR #5233 (branch claude/law-decision-headlines): player-facing text is hand-written with origin "authored" and shippable true in data/english/parts/headlines.json; must be marked shippable false until graded.

Checklist line from words.md; verify against main before starting.

Measured Oct 19 (claude/news-headlines-worded), not built. What the News screen would have to word in a played year: in Milton, North Dakota, Pine Lake, Georgia, Washington, D.C., Cragsmoor, New York, Cochituate, Massachusetts and Umatac, Guam (seed 8c1e02647940d40e) none of the 539 to 1,838 stories a town's news table holds was a death or a closing, the only two kinds the existing news banks can word for a town (`townStoryKinds` in `src/director/data/opening-story.json`, composed by `composeNewsStory`). In one drawn town (seed kinds:0, one year from 2026-10-12) the 767 printed stories by topic were: law decisions under `us-policy-positions` 450, public meetings 60, town halls 40, central bank rate decisions 40, state jobs reports 30, budget lines 20, filings and recordings 40, people 32, introductions, votes and offices taking 30, others 25; the archive stories were law enacted 4, vote 15, law took effect 12, budget adopted 3, parent died 1. The headline bank (`headlines.json`) has roles for council, grant, court, labor-citation, proposal, organization opened and closed, honor, meeting and death only, so a law decision, a town hall, a rate decision or a jobs report has no headline pieces to compose from. A first slice has to author headline and lede pieces for the law-decision story (what changed, in which direction, from the `change`, `series`, `value` and `unit` facts and the amounts' subjects in `data/english/bill-sections.json`) before any wiring; a "Adopts" headline on a cut would say the wrong thing. The wiring is small: `heardItems` in `src/bench/calendar.ts` already feeds `play.mjs`, which shows `headline` and `lede` when a row has them, so a `wordedStory(core, story)` beside `townStory` in `src/director/opening-story.ts` is all the News screen needs.

Sent back 2026-10-20 from PR #5241 (branch claude/news-headlines-more): Merge main 355f7abbdb8d into claude/news-headlines-more conflicts in: src/bench/calendar.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first. Current replacement claim and PR are preserved.

Sent back 2026-10-20 from PR #5233 (branch claude/law-decision-headlines): the release note still promises law headlines whose authored parts are now not shippable, so they cannot show; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5706 (branch claude/political-game-pool-yucp92-bo): data/english/parts/headlines.json:1 and the added src/director headline composers are Words-owned paths. The body explicitly identifies this as a pool session rather than the Words session, so the merger morning check refuses these edits. Route this change through the Words session; also retain the item-specific played-world proof when resubmitting.; finish on that branch, merge main into it first.
