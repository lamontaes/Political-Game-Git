---
id: core-stopgap-life-household-contact-logic-gap
title: "Stopgaps in life (household-contact-logic-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/household-contact
pr: #5279
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/life.ts, kind household-contact-logic-gap"
claimed-at: 2026-10-19T23:29:39.452Z
---

**What.** Replace or clear the 1 open household-contact-logic-gap stopgap row(s) in src/core2/modules/life.ts: SG-P8-household-shared-time-contact. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/life.ts

**Notes.** First row: Shared residence and need for company do not yet reliably produce household contact before distant acquaintance offers.

Measured Oct 19 (Washington, District of Columbia, one played year from the bench opening, `buildBenchWorld` two-level): 235 pairs of full housemates, all 235 have a relationship record, and one has a contact change in the year (the cause "visit"); 234 show none. So the stopgap is still true. The cause is in the offer: `contact-known-person` picks among every known person, scored by `tie-fading` (`src/core2/modules/people.ts`, hours of closeness lost), and a housemate is just one more known person; housemates never need "visits". The fix needs a causal shared-home time: the hours both are home, awake and not at work or school, credited to each housemate pair as contact, with the hours checked against American Time Use Survey time with household members (SOURCED). That is a new mechanic with parameters, so it is left open for a core-area session.
