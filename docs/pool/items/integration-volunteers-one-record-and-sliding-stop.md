---
id: integration-volunteers-one-record-and-sliding-stop
title: "One campaign record feeds the volunteer count, the Volunteers row and the director; volunteers stop the player by race size and tie"
area: elections
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/integration-volunteers
pr: #6403
blocked-on:
source: "Integrator (Opus), Oct 27, from the owner's v0.56.2 sitting (Salida, Colorado, as Carlos Washington)"
lead: director
milestone: play-first
claimed-at: 2026-10-27T19:39:30.000Z
---

**What.** The Campaigns tab shows "1 volunteers" in its header and "volunteer: 0 / 24" a row below, and the Volunteers button spawns the next offer scene. The owner: "it shouldn't be stopped for literally every single volunteer. Maybe some that matter. And that's only when you're doing small local campaigns, or maybe your first campaign. If you're running a presidency campaign and you stop for every little volunteer, like, what are we doing?" One campaign record (volunteerIds) feeds the header, the row and the director; whether an offer is a scene slides with the race's electorate, whether it is the player's first campaign and the helper's tie to the player, with no threshold and no dice.

**Rules.** Sliding scales and causes: no cutoff; the weight falls with electorate size and rises with closeness. No dice. One rule, all 56 places. No hand-written player text: counts are worded by controls.

**Done when.** A test in a drawn place shows the header and the row read the same count; an offer from a close tie in a council race is a scene; an offer from a stranger in a statewide or presidential race joins with a journal line and no scene; the director reads the rule by record id.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Volunteers join a big campaign without stopping you; a friend's offer in your first council race is a scene.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/core2/modules/campaigns.ts, src/bench/campaign.ts, src/bench/play.mjs, src/director/data/situation-types.json, src/director/scheduling.ts

**Notes.** Related: campaigns-volunteer-joined-and-lapsed-records (records of joining and lapsing). Owner, Oct 27, 4 PM Eastern: "Systems are being made for individually instead of linking everything together... The UI needs to be linked to the systems as it works... Sessions should not be building their own shit." Read: OWNER-DECISIONS (Oct 27, afternoon), DECISION-REGISTER, prior-rulings/words.md, LAW; searched docs/ for the subject.
