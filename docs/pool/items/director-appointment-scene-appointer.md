---
id: director-appointment-scene-appointer
title: "A board appointment opens a scene with the person who announces it: the core records no appointer"
area: director
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4738
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** When a central bank governor takes a seat, the director's appointment scene waits on an appointer that the core never records, so the appointment reaches only a journal line. Match the appointment moment to the board's appointment record and name the president serving that day as the appointer, read from the board's seat and the offices' terms, so the scene can open with the president announcing it. A reserve bank president's reappointment has no one to announce it and stays a journal line.

**Rules.** An effect is a read, not a record: the appointer is found by reading the offices' terms, never invented. No hand-written player text: the scene is worded by the English engine. Replace, never layer: the waiting mark on the type is deleted.

**Done when.** In a played world (buildBenchWorld) in a drawn place from a seed the builder did not choose (named in the failure message), a test watches each appointee the day they are named and runs 420 days to the first governor term that ends, and checks the appointment record, the appointee in the scene and exactly one appointer who is not the appointee, by record id.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/director/director.test.ts

**Notes.** Body repaired from the item's title and its pull request on 2026-10-16.

Sent back 2026-10-16 from PR #4738 (branch claude/director-appointment-scene-appointer): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
