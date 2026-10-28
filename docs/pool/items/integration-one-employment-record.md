---
id: integration-one-employment-record
title: "The player's job is one record that Travel, Jobs and study, the card and the director read; offers come through a person"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/integration-one-employment
pr: #6429
blocked-on:
source: "Integrator (Opus), Oct 27, from the owner's v0.56.2 sitting (Salida, Colorado, as Carlos Washington)"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T19:39:30.000Z
---

**What.** A side panel offered "Warehouse worker / Quinn Supply Company / $15.99 per hour" with no person, no interview and no scene, while Travel said "You work here" at Quinn Supply and Jobs and study said "No current job". Travel marks any household member's or relative's employer as the player's own; the offer card comes from the jobs module with no person. Every reader of the player's employment reads person.jobId and core.jobs; Travel says whose work it is; the faceless offer card is deleted and an offer reaches the player only through a person and a scene (LAW: the engine offers, the player decides).

**Rules.** One source per fact; replace, never layer (the offer modal and its second card are deleted, counted); no hand-written player text; one rule, all 56 places.

**Done when.** A test in a drawn place where a housemate works and the player does not: Travel does not say 'You work here' for the housemate's employer, Jobs and study and the card agree; no offer is shown without a person; the jobs tests pass.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Travel, the card and Jobs and study say the same thing about your job, and a job comes from someone you meet.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/places.ts, src/bench/play.mjs, src/bench/data/controls.json, src/core2/modules/jobs.ts, src/bench/jobs.ts

**Notes.** Related open items: play-stop-23-job-offer-ui-implementation, world-player-jobless-no-offers. Owner, Oct 27, 4 PM Eastern: "Systems are being made for individually instead of linking everything together... The UI needs to be linked to the systems as it works... Sessions should not be building their own shit." Read: OWNER-DECISIONS (Oct 27, afternoon), DECISION-REGISTER, prior-rulings/words.md, LAW; searched docs/ for the subject.
