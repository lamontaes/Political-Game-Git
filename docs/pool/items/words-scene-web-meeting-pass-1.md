---
id: words-scene-web-meeting-pass-1
title: "Scene web, meeting people and places, pass 1: four real-life episodes, openings for the thin rows, and the report names a tie's turn"
area: words
kind: feature
priority: 1
size: S
status: claimed
claimed-by: words/web-meeting
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27: first pass of words-scene-web-meeting-people-and-places"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The first pass of the meeting-people domain of the scene web, the quietest stretch of a played year. Four real lives become packets: an introduction at a civic event, a neighbor's ask to join a cause, neighbors falling out over a vote, and making up after the fight. The thin rows get openings that say only what their trigger holds. The report stops printing "tie:" for a type fired by a tie's turn and says which turn.

**Rules.** Serves `scenes-from-life`: a packet per episode, no real name or line ships. Serves `scene-standard`: openings vary and say only what the trigger carries. One rule, all 56 places: the report is regenerated from a drawn place with its seed named.

**Done when.** Four packets in `docs/design/scenes/from-life/` name their types, and `npm run scene-web` (buildBenchWorld, drawn place and seed named) links them. First-meeting, becoming-friends, reunion and argument each have at least four openings. The report names "a tie grew", "a tie soured" or "a tie's re-entry" as the trigger. The gap that no tie-turn type fires is filed for the director. `english-parts-banks` passes.

**Time box.** 4 hours.

**You will see.** In the morning report, the meeting-people rows with real lives behind them and plain triggers. Once the director's item lands, "Someone wants you to meet {other}." in play.

**Screenshot.** The meeting-people section of `docs/reports/scene-web.md` in the PR body.

**Files.** docs/design/scenes/from-life/, data/english/parts/scene-words.json, scripts/scene-web/build.ts, docs/reports/scene-web.*

**Notes.** Part of `words-scene-web-meeting-people-and-places`, which stays open for the other rows.
