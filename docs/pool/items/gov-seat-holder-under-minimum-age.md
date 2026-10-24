---
id: gov-seat-holder-under-minimum-age
title: "M2-01 is red on main in Neibert, West Virginia: a 20-year-old holds a prosecutor seat that requires 21"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/quirky-ride-vrwwz4-seat-age
pr: #5945
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:10:50.586Z
---

**What.** The accepted spec M2-01 (src/core2/offices.test.ts) fails on main 663a38fedf in Neibert, West Virginia (place key 5457916, seed 0196ae8e1ee4a483b092eeea1982822b23a90619612511f7fad5eac98ab07a88) at offices.test.ts:219: 'seat:gus2025:136371:prosecutor:0: expected 20 to be greater than or equal to 21'. The opening seats an official younger than the office's minimum age. Golden-path turned red on #5888 by this draw.

**Rules.** One rule, all 56 places: whoever the opening seats in an office meets that office's qualifications from the place's records, read the same way for every seat.

**Done when.** npx vitest run src/core2/offices.test.ts passes with the seed and place above and three more drawn places named with seeds, with the cause named by line in the PR.

**Files.** src/core2/modules/offices.ts, src/core2/modules/officials.ts

**Notes.** TODO
