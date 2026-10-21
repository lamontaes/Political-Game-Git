---
id: words-past-fact-renderings
title: "English renderings for household, public and archive past facts"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-khi2o3
pr: #5194
blocked-on:
source: "split from core-needs-opus-core-23; docs/coordination/OPUS-CORE.md"
claimed-at: 2026-10-19T22:03:33.344Z
---

**What.** The past module writes three kinds of dated facts the English engine has no words for: `household:*` past facts on a person (livelihood, moves), the `public:*` knowledge of a public figure (party, service, positions, reputation) and the `archive:*` news stories from the year before day one. Today the person card shows the public knowledge as record fields (party, since, votes) and the past as record summaries; the player should read sentences. Author the pieces to the calibrated patterns, wire them through the English engine, and have the card, the journal and the news read them.

**Rules.** No hand-written player text: the pieces live in `data/english/parts/`, authored to patterns, graded in a words batch. An effect is a read: a rendering counts once a card, journal line or news story shows it. Ask why: each sentence cites the past record it came from.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named) the card of the president, whom the player has not met, shows sentences composed from the public figure's record id, a household past fact is worded in the journal, and an archive story is worded in the news, each named by record id. The bank test composes each through the real engine. The owner plays it: click a public official and read what the town knows about them, in sentences.

**Files.** data/english/parts/, src/english/, src/director/journal.ts, src/bench/card.ts

**Notes.** The card's public-knowledge rows (src/bench/play.mjs showPerson) use record field names as labels until this lands.
