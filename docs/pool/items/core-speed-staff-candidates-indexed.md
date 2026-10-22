---
id: core-speed-staff-candidates-indexed
title: "A staff review reads candidates from the place index and shares each resident's facts across officials, instead of every person once per official"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** staffCandidates (src/core2/modules/staff.ts) sorted and walked every full person in the world for each official at each staff review, and staffReview then recomputed each candidate's current pay. Read the official's own known people and family plus the town's residents from core.peopleByPlace instead, and within one review compute each resident's eligibility, working-age weight, pay and applicant row once, shared by every official considered. This is the first slice of core-speed-staff-candidates-scan; the rest of its cost is the reviews times the town's residents and stays on that item.

**Rules.** Speed: never scan the whole world each day; use indexes. No dice: the same people are candidates with the same reasons, and the same staff are hired by record id.

**Done when.** In Long Hill, Connecticut (seed m7b), a played year hires the same staff rows by record id before and after, staffReview's inclusive time in a CPU profile falls by at least a quarter, staff.test.ts passes, and core-speed-staff-candidates-scan stays open for the rest.

**Files.** src/core2/modules/staff.ts

**Notes.** TODO
