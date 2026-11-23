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
after:
lead: elections
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
---

**What.** A resident filed for one council seat ends up on the ballot for a second seat of the same council. In the played world for Pine Village, Indiana (bench seed for place 1860084, test draw seed 481e7f68661a9c52ac455d9d17f5f6d044064bd2:1 of `src/director/donor-ask-scene.test.ts` on branch words/donor-ask-scene), the test filed person_100ab96a014f4908, who had no filing, for the council seat 0 contest of the 2025-11-04 election. Two days later the same person had a second campaign, for council seat 4 of the same council (filing:contest:seat:gus2025:193267:council:4:2025-11-04:person_100ab96a014f4908), and a donor gave to both on 2025-01-23. A person runs for one seat of a body at a time. The first filing was made by a test on an unmerged branch, so the second filing may be a fixture artifact.

**Cause.** Found in code: the fault this item saw was closed on Nov 8 by commit 4f5b676b583 ("a person who filed for one seat on an election day is committed there, whether they chose, a party asked or a retiring holder asked"). `committedOn` in src/core2/modules/candidacy.ts now counts every live filing in another contest held the same day, not only the people the world itself decided for, and all three ways the world files a runner read it (`weighContest`, the party's ask and the retiring holder's ask). Before that change a person filed by hand had no decision row, so the world could still pick them for a second seat. Measured: Pine Village, Indiana (1860084), world seed pine-1, on the train at df168042e6. Council seats 0, 2 and 4 of the same council are up on November 4, 2025. A scratch script (not committed) filed person_6793eb8ecbb60df5 by hand for seat 0 on January 27, 2025, as the item's test did, and played to November 10, 2025. That person holds one filing, for seat 0, on the ballot. Of the 5 filings in the town, no person holds two for one office and one election day.

**Fix.** Nothing to build. Close this item as dropped; the status is left for the lead to set.

**Time box.** 3 hours for one sonnet session, to find which engine filed the second candidacy (world candidacy, a standing filing, or the contest's own seat grouping), by reproducing on main without the test's hand filing.

**Rules.** One rule, all 56 places: the guard holds for any body with several seats. Ask why: name the record that created the second filing. No dice.

**Done when.** A second session finds in a played world (`buildBenchWorld`) on a place drawn from all 56 with a seed the builder did not choose that a resident already on the ballot for one seat of a body is never filed for another seat of the same body in the same election; the test names the place, the seed and the refused or absent filing. Or the cause is written here as a fixture artifact with the evidence.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/candidacy.ts

**Notes.** TODO
