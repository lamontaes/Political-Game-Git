---
id: director-civic-producers-government-last
title: "A public hearing fires as a scene from the public-comment record (the appointer and teller moved to their own items)"
area: director
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4733
blocked-on:
source: "director-civic-producers-government-rest, PR #4606"
claimed-at:
---

**What.** Three civic scene types still wait on a producer because the core's record lacks a person or an event the scene needs. A board appointment (`economy.board-appointment`) names the appointee but no one who announces it, and the scene opens with the appointer. A public hearing is a decision the legislature takes but writes no event for. A law reaching a person (`law.effect-learned`) names the person reached but no teller, and the scene opens with the teller. For each, decide with the government area what stands for the missing person or event (the appointing body's presiding officer, a hearing event, the officer who gave the notice), record it in the core, and replace the waiting mark in the situation catalog with a match on the record.

**Rules.** No dice: a scene fires from a recorded cause. No hand-written player text: the scene's words come from the English engine. An effect is a read, not a record: the new person or event must be read by the director's scene. One rule, all 56 places: a random place and seed. Replace, never layer: each waiting mark is deleted in the same change.

**Scope (Oct 16).** This item builds the public hearing only: the public-comment record is the cause and the chair and members come from its bill. The appointer and teller are `director-appointment-scene-appointer` and `director-law-reached-scene-teller`.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, each of the three types fires for a named person from a named record, shown by a test beside src/director/government-scenes.test.ts, or names a real reason in that year. The owner plays it: he is appointed or hears of a law that reached him and the scene opens with someone he can name.

**Files.** src/director/data/situation-types.json, src/director/civic-roles.ts, src/core2/central-bank-appointments.ts, src/core2/modules/legislature.ts, src/core2/estates.ts

**Notes.** The rest of director-civic-producers-government-rest after its interview, scandal and recall parts (PR #4606). Whether an appointer or teller person should exist is a government design call; build the simplest version that follows AGENTS.md and flag it as an owner-decision stopgap.

Sent back 2026-10-16 from PR #4733 (branch claude/director-civic-producers-government-last): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4733 (branch claude/director-civic-producers-government-last): The branch pool check adds docs/pool/INDEX.md is stale: run npm run pool, which does not occur on the captured clean main. The pool item title changed without regenerating INDEX.md. Regenerate and commit the pool index, then rerun the metadata checks; keep the hearing test and runtime files unchanged. The hearing test, typecheck, changed lint/format, zero-dice and release checks all passed; the two malformed pool items also fail on clean main; finish on that branch, merge main into it first.
