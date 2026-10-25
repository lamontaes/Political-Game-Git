---
id: elections-one-person-two-seats-same-body
title: "A resident filed for one council seat ends up on the ballot for a second seat of the same council"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the played world for Pine Village, Indiana (bench seed for place 1860084, test draw seed 481e7f68661a9c52ac455d9d17f5f6d044064bd2:1 of src/director/donor-ask-scene.test.ts on branch words/donor-ask-scene), the test filed person_100ab96a014f4908, who had no filing, for the council seat 0 contest of the 2025-11-04 election. Two days later the same person had a second campaign, for council seat 4 of the same council (filing:contest:seat:gus2025:193267:council:4:2025-11-04:person_100ab96a014f4908), and a donor gave to both on 2025-01-23. A person runs for one seat of a body at a time. Find which engine filed the second candidacy (world candidacy, a standing filing, or the contest's own seat grouping) and why it did not see the first.

**Rules.** One rule, all 56 places: the guard holds for any body with several seats. Ask why: name the record that created the second filing. No dice.

**Done when.** In a played world (buildBenchWorld) on a place drawn from all 56 with a seed the builder did not choose, a resident already on the ballot for one seat of a body is never filed for another seat of the same body in the same election; the test names the place, the seed and the refused or absent filing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/candidacy.ts

**Notes.** TODO
