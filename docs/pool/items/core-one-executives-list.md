---
id: core-one-executives-list
title: "One data list of executive offices replaces eight hand lists of mayors, county executives, governors and presidents"
area: core
lead: effects
kind: cleanup
priority: 2
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9598
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead's plan for rule 145 A (scenes that play only for who the player is), Nov 15"
checked:
---

**What.** Which offices are executives, which of them head their level's government, and at what level each sits was written by hand in eight places, each a little different. Conditional scenes need one answer to "is this person an executive, and of what", read from data. Seen: a mayor, county executive, governor or president is sworn in giving an address, gives a yearly address, answers a disaster and appears on the government bodies screen exactly as before.

**Cause.** Found in code: eight hand lists of executive kinds on the Train at 892427ec: `EXECUTIVE_KINDS` in src/core2/office-day-acts.ts, `ADDRESS_KINDS` in src/core2/modules/office-day.ts, the mayor and county-executive list in src/core2/modules/executive.ts (local heads beside `BOARD_KINDS`), `CHIEF_KINDS`, `NATIONAL_KINDS` and an inline mayor-or-county-executive check in src/bench/government-bodies.ts, `EXECUTIVE_OFFICES` in src/core2/modules/disasters.ts, `address.kinds` in src/director/data/swearing-in.json and `heads.executives` in src/director/data/local-address.json.

**Fix.** Add src/core2/data/offices/executives.json, one row per executive kind (mayor, county executive, governor, lieutenant governor, president, vice president) with its level, whether it heads that level's executive branch and its citation, read by `executiveRow`, `headsExecutive`, `headsLocalExecutive` and `nationalExecutive` in src/core2/offices-executives.ts. Every one of the eight lists is deleted and reads the rows. The player sees the same addresses, disaster answers and bodies screen.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: every hand list is deleted in the same change, none kept beside the rows. One rule, all 56 places: the rows follow the office kind, never a named state.

**Done when.** A second session plays two years in a played world (buildBenchWorld) at a drawn place and seed it did not choose, on the PR head and on its Train base, and sees the same record count and hash, the same swearing-in and yearly addresses by record id, and the same disaster executive records, and src/core2/offices-executives.test.ts green.

**Waits on.** Nothing.

**Files.** src/core2/data/offices/executives.json (new), src/core2/offices-executives.ts (new), src/core2/office-day-acts.ts, src/core2/modules/office-day.ts, src/core2/modules/executive.ts, src/bench/government-bodies.ts, src/core2/modules/disasters.ts, src/director/swearing-in.ts, src/director/data/swearing-in.json, src/director/data/local-address.json, src/director/local-address.ts
