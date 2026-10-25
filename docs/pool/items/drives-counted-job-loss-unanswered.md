---
id: drives-counted-job-loss-unanswered
title: "Every counted worker's job loss is answered by the drives engine"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In a played year the drives engine answers most job losses, but some counted workers' job-loss events draw no response at all, though the worker is still in the counts when the event is emitted. These are the work.job-lost events whose job id ends ':counted:<date>' (a counted hire's job ended on the day it is dated), all dated on the year's last day in the observed run. src/bench/m1-11-check.ts now reads every event the producers emit (subscribeEvents) and fails any event that named someone able to answer and drew no response, so M1-11 cannot pass until they are answered. Find why respond in src/core2/modules/drives.ts yields nothing for them (countedSubjects, countedPersonOf, perceive or the event's facts) and make the same rule answer them as any other counted job loss.

**Rules.** One model, two tiers: a counted worker's job loss is answered by the same rule as a full person's. No dice: the response is the chooser's, from the person's record. Never loosen the M1-11 check to pass.

**Done when.** src/bench/m1-11-check.ts exits 0 for the M1-11 runner draw in the PR (place and full seed named) with every event that named someone answered, and a test in src/core2 shows a counted worker whose counted job ends drawing a drives response, by event id.

**Files.** src/core2/modules/drives.ts, src/core2/modules/jobs.ts, src/bench/m1-11-check.ts

**Notes.** Found Oct 25, 2026 by the fixer on PR 5972 (roadmap-m1-11-flip): place 0873825, seed 2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7, 11 such events, e.g. event:work.job-lost:2026-01-01:job:position:organization_b0eef0bdf7979a4c:2025-11-01:4:person_ba5ccd780f702e60:counted:2026-01-01 naming person_ba5ccd780f702e60 (still counted when the event was emitted).
