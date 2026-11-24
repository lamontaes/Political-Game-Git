---
id: offices-executives-one-list
title: "Executive offices are one data list with their level, and the five lists typed in code are deleted"
area: office
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: "Account lead's scene build-out, Nov 15, 2026 (owner's rules 143 to 149, given 20:34Z to 20:43Z; plans approved by the Account lead 20:41Z and 20:45Z)"
model: sonnet
effort: medium
root: none
---

**What.** Lawmaking bodies have one data row each with their level, but executive offices are named in five lists typed into code, each a slightly different copy. The scene tags of rule 145 need to know whether the player holds an executive office and at what level, and they must read that from data, not a sixth copy.
Seen: the yearly addresses, the town's departments and the government bodies page play exactly as before, now read from one list.

**Cause.** Found in code: src/core2/office-day-acts.ts line 553 (`EXECUTIVE_KINDS`), src/core2/modules/office-day.ts line 422 (`ADDRESS_KINDS`, a twin of it), src/core2/modules/executive.ts line 728 (mayor and county executive spelled inside `appointTownDepartments`), src/bench/government-bodies.ts lines 50 and 52 (`CHIEF_KINDS`, `NATIONAL_KINDS`) and src/director/data/local-address.json line 31 (`heads.executives`). Lawmaking bodies already read one row each from src/core2/data/offices/bodies.json through `bodyRow` (src/core2/modules/legislature.ts line 3075).

**Fix.** Add src/core2/data/offices/executives.json, one row per executive office kind prefix (mayor, county executive, governor, president, vice president, and any other the offices engine makes), each with `level` in the words bodies.json uses, `heads` (the chief of that level's executive branch) and a `source` citing the constitution or charter. Add `executiveRow(kind)` beside `bodyRow`. Replace each of the five lists with a read of the rows (a local executive is a head at city or county level; national is federal) and delete the five constants; local-address.json drops `executives` and its about text says where the list lives. No behavior changes. Where the player sees it: the yearly address, the town's departments and the government bodies screen, unchanged.

**Time box.** 3 hours for one Sonnet session, one PR. It goes first; the scene tags item stacks on it.

**Rules.** Replace, never layer: the five lists are deleted in the same PR, and no list of executive kinds is left in src. One rule, all 56 places: the rows hold the kinds and levels for every place, never a named state.

**Done when.** A second session, on main, in a drawn place and a seed nobody chose, plays a year and sees the mayor's or county executive's yearly address, the town's department heads and the government bodies page as before, and a search of src for "county-executive" finds it only in data and tests.

**Waits on.** Nothing. The promises thread builds it after its small script PR (Account lead, Nov 15 20:42Z).

**Files.** src/core2/data/offices/executives.json (new), src/core2/data/offices/bodies.json, src/core2/modules/legislature.ts, src/core2/office-day-acts.ts, src/core2/modules/office-day.ts, src/core2/modules/executive.ts, src/bench/government-bodies.ts, src/director/data/local-address.json
