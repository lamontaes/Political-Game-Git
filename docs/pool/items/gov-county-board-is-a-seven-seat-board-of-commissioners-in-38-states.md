---
id: gov-county-board-is-a-seven-seat-board-of-commissioners-in-38-states
title: "Iowa's county is a seven-seat nonpartisan Board of Commissioners with an elected clerk and assessor, like 37 other states"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** In Danville, Iowa, Politics, Government lists the 'Des Moines County Board of Commissioners', 7 seats by district, 'Nonpartisan'. The Advanced start lists Commissioner, Coroner, County assessor, County clerk, County treasurer, Sheriff and County attorney. Iowa counties have a partisan Board of Supervisors of three or five members (Iowa Code § 331.201). They elect an auditor, a treasurer, a recorder, a sheriff and an attorney; the assessor is appointed by a conference board, there is no elected county clerk, and the medical examiner is appointed. News prints 'The Des Moines County Board of Commissioners rejects ...'. Seen: Politics, Government (Local), the Advanced start's list, and News.

**Cause.** Found in code: countyGoverningBodyRules in src/core2/gov-rules/county-governing-body-rules.ts (line 175) reads data/research/local-government/county-governing-bodies.json, whose states cover only AZ, CA, ID, ME, MN, MO, MT, NV, OH, OR, WA and WV. Every other state falls to nationalAverage (7 seats, 'Board of Commissioners', 'Commissioner'). The schedule row data/research/government/county-election-schedule-by-state.json already marks IA partisan, but no member gets a party, so the split shows 'Nonpartisan' (src/bench/play.mjs, splitBar). The row offices come from countyElectedRowOffices (src/core2/gov-rules/county-row-offices.ts, line 97). Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026).

**Fix.** Add a sourced row for every state missing from county-governing-bodies.json: the body's name, member title and size, or size by population, with its statute. Make the county's row offices follow each state's elected list. Give members of a partisan board their party. Data only, one row per state; list in the PR body each state changed with its citation.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: place facts live in data. Research before building: cite each statute.

**Done when.** A second session starts a life on main in a drawn place in a state not in the old list, named with its seed, and Politics names that state's county body, size and parties as its statute says. A test fails on any state that falls to the national average.

**Waits on.** Nothing.

**Files.** data/research/local-government/county-governing-bodies.json, src/core2/gov-rules/county-governing-body-rules.ts, src/core2/gov-rules/county-row-offices.ts

**Notes.** Related: gov-vermont-county-has-a-board-of-commissioners (Vermont should have no board at all); do both rows together or in order.
