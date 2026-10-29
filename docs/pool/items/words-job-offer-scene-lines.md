---
id: words-job-offer-scene-lines
title: "Lines for the job-offer scene: a person at the employer calls with the offer"
area: words
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: words/job-offer-says-job-and-pay
pr: #6746
blocked-on:
source: "Integrator (Opus), Oct 27, from the owner's v0.56.2 sitting (Salida, Colorado): a job offer came with no person, no interview and no scene"
lead: words
milestone: play-first
claimed-at: 2026-10-29T05:40:52.373Z
---

**What.** The owner met "Warehouse worker / Quinn Supply Company / $15.99 per hour" in a side panel with no person, no interview and no scene, and ruled that a job offer comes through a person and a scene or not at all. The integration PR for integration-one-employment-record makes the jobs engine name the person at the employer who makes the offer and record it as `job-offered` (facts offeredBy, invitedId, offerId, organizationId, title, hourlyMinor, deadline); the director stages it as situation type `job-offer` (roles employer and you, setting phone) with purpose `job-offer` (replies ask, agree, decline, stall; endings hired, thinking, turned-down, left-there). No bank has lines for that purpose yet, so the scene does not compose (stopgap SG-DIR-job-offer-lines). This item writes them.

**Rules.** scene-standard and civic-prose: lines from real hiring calls, worded from the record's facts (the job's title, the employer's name, the pay, the deadline, who calls), varying by the caller's traits; four replies that are four different answers (owner, Oct 27). No hand-written player text in code. The narration never says where the player is or who is there (the English ban, tests/guards/no-place-or-presence-restated.test.ts).

**Done when.** In a drawn place the test src/core2/job-offer-through-person.test.ts reaches a `job-offered` record and `purposeScene` for its `job-offer` entry returns `composed` (not skipped), with a lead line, the caller's statement naming the job and pay from the record, and replies whose moves are distinct; a yes through `replyInScene` hires the player (person.jobId names the offered position); SG-DIR-job-offer-lines is resolved and `cause:event:job-offered` is added to scheduling.ownRecordScenes in src/director/data/situation-types.json, so the call stops the day.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Someone from the business calls to offer you the job, says what it is and what it pays, and you answer.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** data/english/parts/scene-talk.json, data/english/parts/scene-words.json, data/english/scene-talk-tags.json, src/director/data/purpose-arcs.json

**Notes.** Data path by the integrator (claude/integration-one-employment). Owner, Oct 27, 4 PM Eastern: "Sessions should not be building their own shit." Read: OWNER-DECISIONS (Oct 27, afternoon), DECISION-REGISTER, prior-rulings/words.md, LAW; searched: job offer, offered, hiring.

Oct 28, 00:50 UTC, director lead: the missing lines also keep `src/director/scene-talk.test.ts` red on main. Three tests (composes every purpose, plays every purpose in play, composes a tree) stop at job-offer with "no narration for job-offer can be worded from the records given", so every purpose type after job-offer goes unchecked until these lines land. Filed as `director-scene-talk-job-offer-skipped`, now dropped into this item.
