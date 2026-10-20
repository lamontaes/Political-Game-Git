---
id: gov-stopgap-justice-missing-mechanic
title: "Stopgaps in justice (missing-mechanic): 2 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The hearing scene has no choice wired to the plea yet; the small version plays the hearing and verdict as scenes only.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/justice.ts, kind missing-mechanic"
---

**What.** Replace or clear the 2 open missing-mechanic stopgap row(s) in src/core2/modules/justice.ts: SG-GOV-justice-player-choices, SG-GOV-justice-no-forfeiture. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/justice.ts

**Notes.** First row: The player's report and plea are decided by the character's own traits and the case's reads, like anyone else's, instead of being offered to the player.
