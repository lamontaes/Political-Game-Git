---
id: words-clerk-no-primary-date-answer-more-wordings
title: "At the filing counter, a race with no primary gets more than two ways to answer the dates, so towns that share an election day do not share a sentence"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-run-filing-clerk-lines-are-composed
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
source: Words builder W5's own finding on #8750 (Nov 11, 2026), written up at Fable B's word (17:47Z)
checked:
claimed-at:
branch:
---

**What.** At the filing counter, the player asks about the dates and the clerk answers. In Holton, Indiana (seed w5-a71c3e) and Mutual, Ohio (seed w5-0b94d2), whose councils share the election of November 4, 2025, both clerks said "Just the one election, November 4." The filing-clerk item's Done when asks that three visits share no clerk sentence of four words or more. Seen: the talk box at the filing counter, after the player asks about the dates.

**Cause.** Found in code: the clerk's answer to the dates is the joined sentence `filing-dates` (`follow/answer`, after `tell`) in data/english/parts/scene-talk.json. Where the race has no primary, the facts hold `no-primary`. Two cores require it with `general` and `deadline`: `scene-talk.follow-answer.just-the-one-election-general-papers-back-to-me-by-deadline` and `scene-talk.follow-answer.it-s-general-no-primary-get-it-all-in-by-deadline`. They fit with three required facts, so `scoredFits` (src/english/scene-talk-words.ts) keeps only them over the two cores that require two (`the-vote-s-general-...`, `deadline-for-the-papers-...`). Two wordings leave every pair of towns with the same election day a one-in-two chance of the same sentence.

**Fix.**
1. Add at least six more `filing-dates` cores (piece `of: "filing-dates"`, `part: "core"`, `required: true`) under `follow/answer` after `tell`, each requiring `no-primary`, `general` and `deadline`. Each names `{general}` and `{deadline}` in different words: the vote's day, the papers' last day, no primary. Short, plain clerk speech.
2. Run `npm run words:rules` twice and `npm run words:verdicts`. Run tests/guards/english, tests/english-parts-banks.test.ts and src/director/filing-visit.test.ts.

**Time box.** 1 hour for one session.

**Rules.** No hand-written player text in code; lines go in the bank only. One rule, all 56 places: no place or date in a line, only the inserts.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places whose councils hold no primary, files for the council in each, and asks the clerk about the dates. It writes the places and seeds down. No two of the three answers share a sentence of four words or more. tests/guards/english passes.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, data/english/pulled.json, data/english/judged/*.json

**Notes.** Written by W5 (2026-11-11). Not built, at Fable B's word. The counter's shot script used for the filing-clerk item is described in #8750's body.
