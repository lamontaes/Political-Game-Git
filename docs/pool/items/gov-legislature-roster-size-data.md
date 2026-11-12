---
id: gov-legislature-roster-size-data
title: "Four legislative chambers' rosters disagree with their legal size: non-voting delegates, vacancies in multi-member districts, added minority seats"
area: gov
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** After the district-name fix (gov-offices-roster-district-name-mismatch), stateOffices seats every chamber at its legal size from data/research/offices/state-offices.json except four, where the roster in data/research/offices/legislature-party-counts-2026.json itself holds a different number of members. One House seats 153 for 151: its roster includes two tribal representatives who sit without a vote. One House seats 386 for 400: the roster lists only sitting members, so a multi-member district with a vacancy seats fewer members and no data gives each district's number of members. A territory's Senate seats 28 for 27 and its House 53 for 51: the roster includes seats its constitution adds for minority parties. Seen: the roster and vote counts of four chambers, which show the right number of voting members.

**Cause.** Found in code: src/core2/offices-state.test.ts (the test 'seats each chamber at its legal size, every roster member once, in all 56 places', near line 251) lists exactly four chambers whose roster in data/research/offices/legislature-party-counts-2026.json holds a different number of members than the legal size: office:US-ME:legislature-lower 153/151, office:US-NH:legislature-lower 386/400, office:US-PR:legislature-upper 28/27, office:US-PR:legislature-lower 53/51.

**Fix.** Research and record in data, each with a citation, the non-voting delegates (Maine), each multi-member district's number of members (New Hampshire) and the minority seats a territory's constitution adds (Puerto Rico). Have stateOffices seat exactly the voting seats the law sets, vacancies included, then empty the test's expected list of disagreeing chambers.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Research before building: each chamber's size and each district's number of members come from the chamber's own law, cited. One rule, all 56 places: the rule is read from data (non-voting delegates, district magnitudes, added minority seats), never a named state in code. Estimate, never UNKNOWN: a vacant seat is a seat, empty.

**Done when.** A second session, in a drawn place and the four chambers' places, finds the test 'seats each chamber at its legal size, every roster member once, in all 56 places' in src/core2/offices-state.test.ts reporting no chamber whose roster disagrees with its legal size, because the research records non-voting members, each multi-member district's number of members and any added seats, each with its citation. In the running game, the four chambers (named by office id in the PR body) show the legal number of seats on the government screen, vacancies shown as empty.

**Waits on.** Nothing.

**Files.** data/research/offices/state-offices.json, data/research/offices/legislature-party-counts-2026.json, src/core2/offices-state.ts

**Notes.** Filed Oct 25 from gov-offices-roster-district-name-mismatch. The four chambers, as the test logs them: office:US-ME:legislature-lower 153/151, office:US-NH:legislature-lower 386/400, office:US-PR:legislature-upper 28/27, office:US-PR:legislature-lower 53/51.
