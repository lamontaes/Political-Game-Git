---
id: director-civic-producers-household
title: "Layoff and eviction fire as their own scenes without doubling the news-arrives scene"
area: director
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/director-civic-producers-household
pr: #4518
blocked-on:
source: "director-civic-producers, found building it"
claimed-at: 2026-10-15T23:16:57.588Z
---

**What.** Layoff and eviction fire as their own scenes without doubling the news-arrives scene. Today a lost job or an eviction already stages a news-arrives scene at home from the money and housing records. The layoff and eviction-notice types are waiting on producers for the same records, so both would fire for one cause. Decide from the records which scene a cause stages (the boss telling the worker at work, or the household hearing it at home) and stage one, never both.

**Rules.** No dice: a scene fires from a recorded cause, never a roll, and a quiet day fires nothing. The chain is the acceptance: each fired scene is traced from its cause record to the scene to the journal line. One rule, all 56 places: a random place and seed from all 56, named. Speed: the ledger acts on the day a record is written, never by scanning the world each day.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a household with a lost job or an eviction gets exactly one scene for the cause, traced to its record id, and a test in src/director/director.test.ts proves no cause stages two. The owner plays it: he loses a job and sees one scene.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json

**Notes.** The first design question is which scene wins, which may be the owner's call; build the simplest version that follows AGENTS.md and flag it. Split out of director-civic-producers.
