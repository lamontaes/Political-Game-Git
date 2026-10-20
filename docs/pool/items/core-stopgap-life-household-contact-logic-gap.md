---
id: core-stopgap-life-household-contact-logic-gap
title: "Stopgaps in life (household-contact-logic-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/household-contact-stopgap
pr: #5279
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/life.ts, kind household-contact-logic-gap"
claimed-at: 2026-10-20T06:13:19.058Z
---

**What.** Replace or clear the 1 open household-contact-logic-gap stopgap row(s) in src/core2/modules/life.ts: SG-P8-household-shared-time-contact. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/life.ts

**Notes.** First row: Shared residence and need for company do not yet reliably produce household contact before distant acquaintance offers.

Measured Oct 19 (Washington, District of Columbia, one played year from the bench opening, `buildBenchWorld` two-level): 235 pairs of full housemates, all 235 have a relationship record, and one has a contact change in the year (the cause "visit"); 234 show none. So the stopgap is still true. The cause is in the offer: `contact-known-person` picks among every known person, scored by `tie-fading` (`src/core2/modules/people.ts`, hours of closeness lost), and a housemate is just one more known person; housemates never need "visits". The fix needs a causal shared-home time: the hours both are home, awake and not at work or school, credited to each housemate pair as contact, with the hours checked against American Time Use Survey time with household members (SOURCED). That is a new mechanic with parameters, so it is left open for a core-area session.
Sent back from PR #5279: test set unstated 900,000ms timeout, crashed vitest worker on 90-day simulation, and stopgap closed without implementing causal shared-home contact mechanics.

**Measured Oct 20 (probe, not committed; claude).** One played year (buildBenchWorld, two-level, every module) in two places drawn at random from seed contact-probe-oct20, counting every recorded contact by who it reached: Harmony, Rhode Island: 128 full people in multi-person households, 4,547 contacts with a household member, 544 with other kin, 16,353 with everyone else. Mauston, Wisconsin: 251 such people, 12,531 household, 953 other kin, 42,483 everyone else. So household members are not left out in a played year (about 35 and 50 household contacts per such person a year); the P13 report of no contact with the husband or children does not reproduce. Not resolved: the stopgap asks for a check of the rate against household time-use and tie-contact evidence, and no sourced per-tie rate was found here, so SG-P8-household-shared-time-contact stays open. Next step: a sourced contact rate for household ties (BLS American Time Use Survey time with household members) and a check of both places against it.
