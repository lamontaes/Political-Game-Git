---
id: story-first-evening
title: "The first evening is told, not listed: one outline planner for the address, the talk at home, the loading story, the Journal's evening and the address's news"
area: words
kind: feature
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: story/first-evening
pr:
after:
blocked-on:
lead: story
model: opus
effort: high
root: none
source: owner, Nov 23, about 11:05 p.m. after playing v0.114.0 ("it doesnt look like anything is working ... how do you propose finally getting this right") and his go at about 12:20 a.m. ("go ahead... have story work through the night"); the CTO's brief to the Story lead, Nov 24 (docs/coordination/story-lead-brief-2026-11-24.md on claude/cto-playtest-nov23)
checked:
---

**What.** The first evening (the loading story, the Jan 20 address, the arrival, the first talk at home, the Journal's first page and the first news) reads as told text, not lists and stock frames (sitting 2026-11-23-1: P5, P6, P7, P8, P11, P19, P43, P45).

**Cause.** Design: every point of every address took one skeleton (`pointShapes` in `src/director/data/speech-outlines.json`: today, figure, ask), so every speech shared the frame he heard for a month; the Jan 20 opening played as a State of the Union because no inauguration was on record that day (fixed by #10330); the Journal had no row for the address the household watched, so the evening was never written; the loading card printed the person card's dated one-liners; a law that changed nothing printed as a story ("holds at", P45).

**Fix.** One outline planner (`src/english/outline-planner.ts`, rows in `data/english/outlines.json`, pieces in `data/english/parts/outline.json`): each section offers shapes counted from real speeches, news stories and diaries (`docs/research/first-evening-2026-11-24.md`), drawn per moment and weighted by the speaker's traits; a piece that leans on the sentence before it names what it may follow; a fact is said within its budget. The inaugural, the talk after it, the loading story, the Journal's evening and the address's news story go through it.

**Time box.** One night (Nov 24).

**Rules.** No figures in speeches; replaced means deleted; his examples are concepts; real sources set shape and rhythm only (quotes of 15 words or fewer); words PRs never go to the merger desk; nothing merges until he passes it in a played game.

**Done when.** The owner plays a new life in the installed game and says the first evening is right; before that, a pre-grader session that did not build it plays three drawn places and grades the evening as he would.

**Files.** src/english/outline-planner.ts, src/director/inaugural-telling.ts, src/director/journal-evening.ts, data/english/outlines.json, data/english/parts/outline.json, scripts/words/first-evening-packet.ts

**Notes.** Nov 24 (Story lead): built on story/first-evening; the packet of three drawn places is docs/story/first-evening-packet.md on that branch.
