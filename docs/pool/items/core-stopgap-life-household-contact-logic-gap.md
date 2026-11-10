---
id: core-stopgap-life-household-contact-logic-gap
title: "Stopgaps in life (household-contact-logic-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: open
standard: 2
claimed-by:
pr: #5279
after:
blocked-on:
milestone:
model: sonnet
effort: medium
root: none
lead: researcher
source: "src/core2/data/stopgaps.json, src/core2/modules/life.ts, kind household-contact-logic-gap"
claimed-at:
size: S
checked: fable 2026-11-10
---

**What.** The stopgap row SG-P8-household-shared-time-contact (marker in src/core2/modules/life.ts, row in src/core2/data/stopgaps/p8.json) says shared residence does not reliably produce household contact before distant acquaintance offers. A probe on Oct 20 (one played year, buildBenchWorld, seed contact-probe-oct20) showed housemates are not left out: Harmony, Rhode Island had 128 full people in multi-person households with 4,547 household contacts (544 other kin, 16,353 everyone else), and Mauston, Wisconsin 251 such people and 12,531 household contacts, about 35 to 50 household contacts per person a year. What the row still lacks is a sourced per-tie rate: BLS American Time Use Survey time with household members. A search on Oct 21 found only the childcare figures, not a with-whom table.

**Cause.** Measured: Oct 20 probe (one played year, buildBenchWorld, seed contact-probe-oct20): Harmony, Rhode Island 128 full people in multi-person households with 4,547 household contacts (544 other kin, 16,353 everyone else); Mauston, Wisconsin 251 such people, 12,531 household contacts. So housemates are not left out (about 35 to 50 household contacts per person a year); the row SG-P8-household-shared-time-contact in src/core2/modules/life.ts (line 294) only lacks a sourced per-tie rate.

**Fix.** Source household time-use from ATUS (the BLS tables of who was with the respondent, or the ATUS-X extract), compare the played rate in two drawn places with it, and resolve or narrow the row to what the comparison shows.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real data checks the simulation and never decides one actor's outcome. Estimate, never UNKNOWN: if the table cannot be found, the rate starts from the real average with a spread, marked ESTIMATED with its source. Never close a row by deleting it. One rule, all 56 places: the comparison draws its places from all 56.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in two drawn places (places and seeds named) and reports each place's household contacts per person beside the ATUS time with household members as figures, not a pass or fail; SG-P8-household-shared-time-contact is resolved or narrowed in src/core2/data/stopgaps/p8.json with the sourced rate in the parameter table.

**Waits on.** Nothing.

**Files.** src/core2/modules/life.ts, src/core2/data/stopgaps/p8.json, src/core2/life-contact-frequency.test.ts

**Notes.** First row: Shared residence and need for company do not yet reliably produce household contact before distant acquaintance offers.

Measured Oct 19 (Washington, District of Columbia, one played year from the bench opening, `buildBenchWorld` two-level): 235 pairs of full housemates, all 235 have a relationship record, and one has a contact change in the year (the cause "visit"); 234 show none. So the stopgap is still true. The cause is in the offer: `contact-known-person` picks among every known person, scored by `tie-fading` (`src/core2/modules/people.ts`, hours of closeness lost), and a housemate is just one more known person; housemates never need "visits". The fix needs a causal shared-home time: the hours both are home, awake and not at work or school, credited to each housemate pair as contact, with the hours checked against American Time Use Survey time with household members (SOURCED). That is a new mechanic with parameters, so it is left open for a core-area session.
Sent back from PR #5279: test set unstated 900,000ms timeout, crashed vitest worker on 90-day simulation, and stopgap closed without implementing causal shared-home contact mechanics.

**Measured Oct 20 (probe, not committed; claude).** One played year (buildBenchWorld, two-level, every module) in two places drawn at random from seed contact-probe-oct20, counting every recorded contact by who it reached: Harmony, Rhode Island: 128 full people in multi-person households, 4,547 contacts with a household member, 544 with other kin, 16,353 with everyone else. Mauston, Wisconsin: 251 such people, 12,531 household, 953 other kin, 42,483 everyone else. So household members are not left out in a played year (about 35 and 50 household contacts per such person a year); the P13 report of no contact with the husband or children does not reproduce. Not resolved: the stopgap asks for a check of the rate against household time-use and tie-contact evidence, and no sourced per-tie rate was found here, so SG-P8-household-shared-time-contact stays open. Next step: a sourced contact rate for household ties (BLS American Time Use Survey time with household members) and a check of both places against it.

Sent back 2026-10-20 from PR #5279 (branch claude/household-contact-closed): The pool Done when requires a one-year played-world proof of another engine reading the replacement by record id. The new household-contact.test.ts advances only 90 days, and the body reports that same quarter without a named downstream reader record. Complete the named year/reader proof before resolving the row. Also remove the resolved-Oct-19 session/date note from the new test header.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5269 (branch claude/household-contact-note): This is a useful played-year finding, but the body explicitly leaves SG-P8-household-shared-time-contact open for its time-use evidence check. The linked item Done when requires the row resolved and another engine reading the replacement by record id. Keep that unfinished item open; finish the named evidence or track this completed finding-only note separately so merging it does not complete the broader item.; finish on that branch, merge main into it first.

Looked at Oct 21 (claude), research not completed. A search for ATUS time with household members found the 2023 release's childcare figures (primary childcare 2.3 hours a day with a child under 6, 52 minutes with the youngest 6 to 17; https://www.bls.gov/news.release/atus.nr0.htm) but no "with whom" table for time with a spouse or household members; a non-BLS blog gives just under 2.0 hours a day with household members in 2019, unverified. The BLS "who was with the respondent" tables (the tables that follow the release's text, or the ATUS-X extract) are the place to read it. Claim released.
