---
id: words-scene-web-home-pass-1
title: "Scene web, home and family, pass 1: four real-life episodes, and the win night, funeral and news lines they show are missing"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: words/web-home
pr: #6346
blocked-on:
source: "words-and-scenes lead, Oct 27: first pass of words-scene-web-home-and-family"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The first pass of the home-and-family domain of the scene web. Four types that fire in a played year had no real life behind them and thin lines: news arriving at home, a funeral, the win marked at home, and a first day at a new job. Each gets a packet from a real life, and the lines those packets show are missing are written. The gaps that need a producer or an engine are named for their leads.

**Rules.** Serves `scenes-from-life`: a packet per episode, no real name or line ships. Serves `scene-standard`: lines vary by speaker and say only what the scene's facts carry. One rule, all 56 places: the report is regenerated from a drawn place with its seed named.

**Done when.** Four packets in `docs/design/scenes/from-life/` name their types, and `npm run scene-web` (buildBenchWorld, drawn place and seed named) links them, so rows without an episode drop. The win night gains follow-ups for the relative's asks. The funeral's ask no longer assumes the player holds office. News arriving gains openings where the bearer waits. Every speaker in family-win and family-loss has at least three lines, and `english-parts-banks` and `scene-talk.test.ts` pass.

**Time box.** 4 hours.

**You will see.** On the night of a win, a relative asks for one night a week back; at a funeral, a mourner asks the player to carry what the dead left unfinished, in words that fit anyone.

**Screenshot.** The home-and-family section of `docs/reports/scene-web.md` in the PR body.

**Files.** docs/design/scenes/from-life/, data/english/parts/scene-talk.json, data/english/parts/scene-words.json, docs/reports/scene-web.*

**Notes.** Part of `words-scene-web-home-and-family`, which stays open for the other rows.
