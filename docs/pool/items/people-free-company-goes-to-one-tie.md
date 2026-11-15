---
id: people-free-company-goes-to-one-tie
title: "The chooser always visits the hardest pull, so one person draws a quarter of all visits and others are never visited"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: legislature-colleague-ties-stay-slight
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, tracing people-colleagues-company-all-goes-to-the-player (the Account lead asked for it as its own item, the next PR after legislature-colleague-ties-stay-slight)
---

**What.** When a person spends free time with someone they know (`contact-known-person`), the chooser takes the candidate with the hardest pull every time. Nothing else enters, so whoever leads the pulls draws the visits, and anyone in the middle of everyone's table is never visited. At 4846968 (Texas) seed 8647-mason, player at seat 016, Feb 1 to 14, 2025 (on #9557 d1d43521, counted from every change notice), the senators made 181 visits to colleagues. Senator 022 drew 46 (a quarter), 019 drew 24 and 030 drew 15, and the player drew none, because the player's pull is mid-table for every colleague. Across the town, Feb 1 to Mar 31: of the 211 people with 5 or more visits, 65 give 90% or more to one person, 23 of them to kin and 42 to someone else. On the town council, 78bac2d6 gave all 9 of its visits to 63001615. That closeness decided the March 31 police budget vote (78bac2d6 voted yes on 63001615's bill). Real people spread their time over the people they know, and someone others know is visited now and then. Seen: nobody ever comes to see the player, colleagues and friends keep company with one favorite, and the player's evenings and Journal never show a visitor.

**Cause.** Found in code: `tiePull` (src/core2/modules/people.ts, the `tie-fading` reason) weighs `tieHoursLost`. That is a tie's hours lost since the two were last together, so it grows with the tie's size: a tie of 40 hours loses more hours in a day than a tie of 2 loses in a month. Each visit makes the visited tie the biggest, so it pulls hardest the next day too. Closeness itself is concave in hours (closeness.ts, hours / (hours + `closenessHoursAtHalf`)), but the pull reads hours, not closeness.

**Fix.** Make the pull read what a person misses: the closeness the tie has lost since the two were last together. That is the level at the last contact minus the level today, from the same `currentCloseness` and `levelFromHours`, and it applies to both the row and the shared hours. Because closeness is concave, an hour lost from a strong tie costs less closeness than an hour lost from a weak one, and a tie just renewed has lost almost none. So company spreads over the people one knows, in proportion to how much each has faded. Reuse `tieMissingWeightPerHour` in its new unit, say so in its row, and add no new parameter. Do not cap hours per person.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the spread comes from each tie's own record. Wire to the world: proven in played worlds, with the council vote at 4846968 traced again. Speed: no new scan; the pull reads the same row and readers.

**Done when.** A pinned test at 4846968 seed 8647-mason (about a minute, seen red on today's code) shows each senator's `contact-known-person` acts from Feb 1 to 14, 2025, with most senators giving their company to at least three colleagues and none giving every day to one. A played year in a drawn place, and at three named places, stays within the speed bar, with the outcome changes traced by record. A second session sees in dev mode on main a Journal whose evenings are spread over several people.

**Waits on.** legislature-colleague-ties-stay-slight, so colleagues' ties differ by the rooms they really share before the pull is measured.

**Files.** src/core2/modules/people.ts, src/core2/closeness.ts, src/core2/data/parameters.json

Nov 15 (lying thread): the fix above was built and dropped. Reading the closeness lost instead of the hours lost made family visits fall: in src/core2/m0-meeting-people.test.ts, visits a year to each parent went from 26.2 to 9.9, to each sibling from 12.5 to 8.2, and hours with family outside the home from 189 to 85 against ATUS 170, under the test's lower bound of 85.2. Any concave reading of the pull does this, because kin are strong ties. Do not build it, and do not move the weight. Measured on ee4c3740 (rooms and attendance) at 4846968 seed 8647-mason, Feb 1 to Mar 31, 2025: senators made 22 company acts, all among 016, 022 and 024; the council pair 78bac2d6 and 63001615 made none. Of the 30 full people with 5 or more acts, the median share to their top tie was 0.75, and 14 gave 90% or more to one person, never kin. Three findings: (1) small circles: e5296d06 knows four people, three of them its household, so its one outside tie fd2ec807 gets every act (14 of 14). That is right, and there is nothing to fix. (2) A pick that is not the top pull: 8ccd5ae0 gave 11 of 11 acts to its strongest tie 63001515 on days when 63001515's tie-fading pull ranked fourth or fifth, so another term of the chooser favors the stronger tie. That term is not yet found; the next step is reading the chooser's score for `contact-known-person` with one actor traced by hand. (3) Turning the observer on changes the picks (core-observer-changes-choices). This item now waits behind the statewide associations work.

Nov 15, later (lying thread): the numbers above came from `latestChange`, which a tie keeps only when it touches the player's circle (state.ts `retainRelationshipEvidence`). Recounted from every relationship change notice (the lying thread's count script on ee4c3740, 4846968 seed 8647-mason, Feb 1 to Mar 31, 2025, observer off): 2,751 visits by 226 people; of the 211 with 5 or more, the median share to their top tie is 0.71 (p25 0.50, p75 1.00), and 65 give 90% or more to one person: 23 to kin and 42 to someone else, 20 of those with 10 or more visits. The council pair: 78bac2d6 gave 63001615 all 9 of its visits, 63001615 gave it none. Senators: as before, 22 visits among 016, 022 and 024; the rest are tier `calendar` and choose nothing (legislature-senators-keep-no-company-in-session, cause found). Finding (2) is withdrawn: 8ccd5ae0 visits every other day in turn among seven people (63001515 12 of 29), so there is no hidden term favoring the strongest tie. Findings (1) and (3) stand. The one-tie pattern is real for about a fifth of the people who visit, a third of them kin.

Nov 15, later still (lying thread): once the player's colleagues stay in the player's circle (the #9557 fix), at 4846968 seed 8647-mason, player at seat 016, Feb 1 to 14, 2025, the senators make 181 visits to colleagues, counted from every change notice: 022 draws 46 (0.25), 019 24, 030 15, the player none. 022 is one of the few colleagues with tie rows, and a row adds lost hours on top of the shared sitting hours, so its pull leads; the player's pull is mid-table for every colleague, and the chooser takes the hardest pull every time. colleagues-company.test.ts dropped its "no colleague above a quarter" line for this; this item's fix brings it back.
