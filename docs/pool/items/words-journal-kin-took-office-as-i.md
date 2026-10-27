---
id: words-journal-kin-took-office-as-i
title: "The journal says \"I took office\" when a family member took office"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: words/kin-took-office
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T08:46:51.378Z
---

**What.** When the player's father won a council seat, the player's own journal said "I took office as Council member." on the day the father was sworn in. The took-office record names only the winner, so the player's journal tells someone else's swearing-in as their own. The journal row for event:took-office has only first-person lines and no line for someone else's moment, unlike the election-result row, which has both. Seen in the bench in White Sulphur Springs, Montana (3080050), place seed e6253d7d132141ef79226210a85a474e90a1d2bb2d5ea41a69c63b9bfdb96035: the player person_f20a24acaa8c0691's journal line person_f20a24acaa8c0691:2026-01-01:took-office:seat:gus2025:108118:council:4:2026-01-01 cites took-office:seat:gus2025:108118:council:4:2026-01-01, whose winner is the father person_f20a21acaa8c0178.

**Rules.** No hand-written player text: the other-person lines are bank pieces in the journal part, worded by the English engine and shippable under the owner's Oct 24 rule. Ask why: the line says whose swearing-in it was from the record's winner, never from a guess. One rule, all 56 places: the lines name no place.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a household member's took-office record gives the player's journal a line that names that person and the office, citing the took-office record id, and never a first-person line; the player's own took-office still reads in the first person. A test in src/director fails with the other-person lines removed.

**Files.** src/director/data/journal-rows.json, src/director/journal.ts, data/english/parts/journal.json

**Notes.** TODO
