---
id: director-civic-producers-electoral
title: "Election results, filing and campaign stops fire as scenes for the people they reach"
area: director
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/director-civic-producers-electoral
pr: #4585
blocked-on:
after: director-civic-roles
source: "director-civic-producers, found building it"
claimed-at: 2026-10-16T03:24:06.615Z
---

**What.** Election results, filing and campaign stops fire as scenes. The core writes `election-result` and `candidate-filed` events and the director already sizes them as moments, but the types race-won, race-lost, filing and campaign-stop are marked as waiting on a producer. Drop that mark for each, bind its roles (candidate, supporters, family, clerk) from the records, and let the scene fire for the person the event reaches. The filing visit in filing-visit.ts is the existing producer for the filing scene; fold it into the same path so there is one.

**Rules.** No dice: a scene fires from a recorded cause, never a roll, and a quiet day fires nothing. The chain is the acceptance: each fired scene is traced from its cause record to the scene to the journal line. One rule, all 56 places: a random place and seed from all 56, named. Speed: the ledger acts on the day a record is written, never by scanning the world each day.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a player who files and then wins or loses a race gets a filing scene and a result scene, each traced to its record id, and the reach report (src/director/reach.ts) lists the four types as fired. Tests in src/director/director.test.ts and scene.test.ts prove it. The owner plays it: he files and sees the clerk scene, then the night of the result.

**Files.** src/director/ledger.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/director/filing-visit.ts

**Notes.** Needs director-civic-roles for the clerk and the supporters. Split out of director-civic-producers.
