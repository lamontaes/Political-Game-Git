---
id: gov-succession-vp-foreign-born-red
title: "succession.test.ts fails on main: the vice president is drawn foreign-born and the birth-record test expects native"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Checked on main (Oct 16, claude/vp-foreign-born).** Does not reproduce. The president and vice president were native-born in all 74 random seeds built in the two-level bench world on October 12, 2026 (`qualified` in `nativityFact`, set for the two seats in `src/core2/state.ts`, since the October 15 change that made the line of succession read birth records), and `src/core2/succession.test.ts` passes (5 of 5). The red report was most likely taken before that change landed. A seed that still fails would reopen it. While scanning, a different rare failure turned up: `core-past-public-future-fact` (PR #4725).
