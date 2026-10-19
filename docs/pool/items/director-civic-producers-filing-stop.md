---
id: director-civic-producers-filing-stop
title: "The filing scene and the campaign stop fire as scenes for the people they reach"
area: director
kind: wiring
priority: 1
size: M
status: done
claimed-by:
pr: #4737
blocked-on:
after: director-civic-producers-electoral
source: added with npm run pool -- add
claimed-at: 
---

**What.** Two of the four civic election scenes still wait on a producer: the filing visit and the campaign stop. The filing scene needs the clerk of the filing office, who has no record in the core yet (the pool item gov-clerk-person; `src/director/civic-roles.ts` leaves the role unfilled and the scene cannot bind). The campaign stop needs a campaign event as its cause: a speech, a door-knock day or a rally the campaigns engine records for the candidate, with the voters it reached. Give each a match in `src/director/data/situation-types.json` (replacing the `awaitingProducer` marks), bind their roles from those records, fold the filing visit in `filing-visit.ts` into the same path so there is one, and let both scenes fire for the person the event reaches. The player would notice a clerk at the counter when he files and a crowd at a campaign stop.

**Rules.** No dice: a scene fires from a recorded cause, never a roll, and a quiet day fires nothing. The chain is the acceptance: each fired scene is traced from its cause record to the scene to the journal line. One rule, all 56 places: a random place and seed from all 56, named. Speed: the ledger acts on the day a record is written, never by scanning the world each day. Replace, never layer: the `awaitingProducer` marks and any second filing path are deleted in the same change.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a player who files gets a filing scene with a named clerk and a campaigning candidate gets a campaign stop scene, each traced to its record id, and `src/director/electoral-scenes.test.ts` asserts it. The owner plays it: he files and sees the clerk scene, then campaigns and sees the stop.

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts, src/director/civic-roles.ts, src/director/filing-visit.ts, src/director/electoral-scenes.test.ts

**Notes.** Split out of director-civic-producers-electoral when the race-won and race-lost scenes were built. Needs the pool item gov-clerk-person (on the director-civic-roles branch, PR #4516) for the clerk.

Sent back 2026-10-16 from PR #4737 (branch claude/director-filing-stop): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
