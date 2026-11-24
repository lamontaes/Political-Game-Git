---
id: words-rival-filed-late
title: "A player who files after others is told the day after who is already on the ballot"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: story/director-rival-filed-late
pr: #8126
blocked-on:
lead: words
milestone: play-first
source: "a played candidate year listed rival-filed as never firing: the elections engine tells it only to a candidate already on the ballot when someone files after them, so the player who files last is never told who they run against"
claimed-at: 2026-11-10T09:00:00.000Z
merged-at: 2026-11-10T08:36:00.786Z
seen-by: second-session-2
seen-at: 2026-11-11T01:32:38.969Z
---

**What.** A second row, `rival-known-late` (circumstances.json), follows the player's own candidate-filed record by one day, as race-result-known-after-ran follows a count. A new player gate, `filed-late`, holds only where someone else is already on the contest's ballot. Someone in the player's household tells them, on the rival-filed type's new circumstance cause. The scene names the candidates from the contest's filing records (`rivals`, cited to each filing), each said by what the candidacy shows: "incumbent Hannah Wilkins", or "Democratic candidate Bo Chen" where a party label is on the filing. Four new pieces use it; the nine older state lines (about a rival who just filed) are excluded when the news is of candidates already on the ballot (`excludesFacts: already-filed`). The original rival-filed cause is unchanged and still plays for the earlier filer.

**Found along the way.** tests/english-parts-banks needed the new `rivals` slot declared.

**Done when.** src/director/rival-filed-late.test.ts, in a drawn contested race, files the player after the world's candidates, composes the household's telling the next day with `rivals` naming each earlier candidate with their record ids, and finds the earlier filer told by the original rival-filed cause; director.test.ts, the families guard, the English guards and english-parts-banks pass. (primary-challenge.test.ts is red on seed 5 on main already: no drawn race had a same-party rival.)

**Files.** src/director/circumstance.ts, src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/rival-filed-late.test.ts

**Time box.** 1 hour.

**You will see.** The day after you file: "Before you filed, incumbent Hannah Wilkins put in for County assessor."

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn seed 1611a4081e31 (test world), seed 1611a4081e31, main 32a6683b: rival-filed-late.test.ts passed on a fresh seed in a drawn contested race, composing the household's telling the next day
