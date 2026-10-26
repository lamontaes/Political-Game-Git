---
id: gov-officials-first-served-below-legal-age
title: "35 of 1,573 sitting officials first took office below the Constitution's age: a senator at 29, House members at 21 to 24"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/first-term-age
pr: #5054
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T15:28:32.277Z
---

**What.** In the played world, 35 of 1,573 sitting officials (Delaware City, seed a1) began service before they were old enough for the office: a senator at 29, House members at 21 to 24. The opening draws each holder's service start as a date and then moves it later only to the year they would be of age, which keeps the draw's month and day, not their birthday; and for holders the offices engine seated, the correction is skipped on the belief that its careers already keep to it, and they do not (a House member born in 1989 first served in 2011). Move every holder's service start to the day they turn the age the office asks, which is the Constitution's 30, 25 and 35 for the Senate, the House and the presidency, and the first-term minimum for all.

**Rules.** The Constitution decides eligibility, never a roll: the age is data from the clause. No dice: the start is the later of the drawn start and the birthday. One rule, all 56 places: the check runs over every place's roster.

**Done when.** In the played world (`buildBenchWorld`, a drawn place and seed, Clayton, Idaho with seed ft1 among them) no official's age on the first day of service is below the age their office asks, and `src/core2/officials-first-term-age.test.ts` states it and fails on main.

**Files.** src/core2/modules/officials.ts

**Notes.** Found Oct 18 (claude/first-term-age) while checking the filing ages (elections-federal-office-minimum-age). A February 29 birthday counts on March 1, as the filing check does. Seniority and committee leadership read the service start, so a few holders' ranks may shift by a place; the officials, leadership, offices and seniority tests pass.

The same check covers the state's own age for its legislators and statewide officers (28 more of 987 state officials, mostly sample members of other states' legislatures, started below their state's age, for example 20 against 25 in Arizona's lower house); the age is the filing rules' for that state.
