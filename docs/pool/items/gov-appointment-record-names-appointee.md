---
id: gov-appointment-record-names-appointee
title: "An appointment's public record names who appointed but not who was appointed"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/appointment-names-appointee
pr: #6197
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T23:17:57.263Z
---

**What.** The public record of an appointment (kind official-appointed) keeps only the post and the appointing official (facts post and appointedBy), so News can say 'Post City clerk · Appointed by Ray Cannon' but never who now holds the post. Seen in Horn Hill, Alabama (seed 7581a656-3e18-40af-b786-560383b29e4e) on the bench and in the October 24 playtest ('Official appointed' with no names). A player cannot tell who runs the city's departments from the record.

**Rules.** Wire to the world: the record names the person the appointment reached, by id, so News, Government and the director read the same fact. One rule, all 56 places.

**Done when.** In a drawn place, every official-appointed record carries the appointee's person id, News names the appointee, and a test over the opening's appointment records in two drawn places finds none without one, naming place and seed.

**Files.** src/core2/modules/officials.ts, src/bench/play.mjs

**Notes.** TODO
