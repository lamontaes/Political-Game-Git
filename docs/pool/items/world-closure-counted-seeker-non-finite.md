---
id: world-closure-counted-seeker-non-finite
title: "A business closure writes a non-finite number into a counted job seeker's row and stops the world build"
area: world
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/closure-seeker-finite
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T20:03:46.873Z
---

**What.** On Oct 24 src/core2/legislature-committees.test.ts failed during its world build, before any test ran, with 'Module data must be finite, acyclic JSON data' thrown from the countedSeekers put in the jobs engine's closure handler (src/core2/modules/jobs.ts:3154, called from applyCoreEvent at src/core2/state.ts:2048). The row copies the closed job whole (lastJob: { ...job }) and its referenceHourlyMinor, so one of the counted job's fields was NaN or infinite. The test draws its place from a random seed and the failure came before it printed one, so the place is unknown. It happened on branch claude/laws-end-to-end-proof, which does not touch the jobs engine.

**Rules.** Find the cause at its source (the counted job whose field is not finite), never by filtering the row. One rule, all 56 places. The fix names the field and the line that produced it.

**Done when.** The field that was not finite is named by file and line with the cause, the producer is fixed, and a test that builds the bench world in the place where it reproduces (seed named) passes; legislature-committees.test.ts prints its seed before it builds a world, so a failure there names its place.

**Files.** src/core2/modules/jobs.ts, src/core2/legislature-committees.test.ts

**Notes.** Found by the laws lead's gate on Oct 24.

Oct 24, 2026 (claude/closure-seeker-finite): the field was `occupationClassification`, not a number. A counted hire copies it from its position's template (`src/core2/modules/jobs.ts`, `hireCounted`), and a press outlet's staff job has none (`startPublicJob`), so the counted job held the key with the value undefined, which module data refuses with the same message. Reproduced in Traskwood, Arkansas (draw seed `c2-b`, purpose `committee-markup`): `job:position:organization:press:radio:0:jurisdiction_03b63710264691a8:2027-01-01:1:person_b0b6ea54fc4dbc6f`. Fixed there, in the full hire and in the opening's population builder.
