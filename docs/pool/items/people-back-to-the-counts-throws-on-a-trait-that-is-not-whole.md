---
id: people-back-to-the-counts-throws-on-a-trait-that-is-not-whole
title: "Sending a household back to the counts throws for most households: 'A counted trait is not a small whole number' (red on main in src/core2/jobs.test.ts)"
area: people
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Fable, Nov 10, 2026, measured on main and on the country tier branch while probing the fast clock
---

**What.** Returning a filled-in household to the counts (demoteHousehold in src/core2/modules/counted-demotion.ts, which calls returnToCounts and CountedStore.addMember in src/core2/counted-groups.ts, line 369) throws 'A counted trait is not a small whole number: <trait>' whenever a member's trait is not a whole number between -127 and 127. Measured Nov 10 in Chumuckla, Florida (953 people; draw seed k3 with the label skip-probe; world seed aa4665b284a797eb671c6eafef8865086489b881e3eb81e1116a200598fb6482), on the second day of the game: of 896 households, 822 threw this error when sent back to the counts (people-mind-v1:sociability 560, people-mind-v1:risk 214, people-mind-v1:reliability 24, personality-v1:patience 19, people-mind-v1:deliberation 5); 41 more threw 'A job ends before its day's work, from calendar work.' and 25 threw 'No residents account for US-FL' or 'US-DC'; only 11 went back. The same error fails two tests of src/core2/jobs.test.ts on clean main ('lets a full person take a role first held by a counted worker, on that worker's schedule' and 'opens positions for a counted worker's role and withdraws surplus postings gradually'), and a household that throws part way leaves the residents' records half changed (the next day then failed with 'Cannot read properties of undefined (reading households)' in residentCounts). The counted store keeps traits as small whole numbers; full people's traits are no longer whole (something writes fractions to them: find the writer).

**Rules.** One model, two tiers (owner, Oct 14): a person can go back to the counts and be the same person when met again, so the tiers must agree on what a trait is. No silent rounding that changes a decision: say in the PR whether the fix keeps fractions in the counted store or keeps full people's traits whole, and why. Red main comes first (owner, Oct 15).

**Done when.** src/core2/jobs.test.ts passes on main in three drawn places named with their seeds. A new test sends every household of a drawn town back to the counts on the second day and after a played year: none throws, and a household that cannot go back for a stated reason (a job attended that day) is refused before any record changes, with the world left as it was. A second session, on main in a drawn place, plays 240 days without touching a neighbor, then reads dev mode's Watch panel: the household shows as back in the counts and the game has not thrown.

**Files.** src/core2/counted-groups.ts, src/core2/modules/counted-demotion.ts, src/core2/jobs.test.ts, src/core2/modules/trait-change.ts

**Notes.** Found by a probe that tried to send everyone outside one household's circle back to the counts before a long skip (item core-fast-clock-twenty-years needs exactly that). The Haiku check of clean main on Nov 10 gave the two failing test names above. Not checked: whether the monthly review in play (counted-demotion-review) catches the throw or never picks these households.
