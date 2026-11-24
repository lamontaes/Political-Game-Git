---
id: filing-clerk-names-one-rival-when-the-page-lists-the-whole-field
title: 'The filing clerk says "you and one rival" when the Elections page lists several'
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: low
root: none
source: Account lead played walk, Nov 16, 2026 (run-for-office-played.md, Millville PA and McMinnville TN on Train 6d12556a)
---

**What.** After the player files, the clerk says the field is the player and one named rival, but the race page lists several candidates. The player is told a smaller field than the one the page shows. Seen: at Millville, Pennsylvania on January 21, 2025 the clerk said "You and John Vega for the council, then" while the page listed John Vega, Parker Murphy and Ravi Rich, and at McMinnville, Tennessee on June 23, 2026 the clerk said "You and Haley Wilkerson for alderman" while the page listed six others.

**Cause.** Found in code: `filedFor` in `src/bench/filing.ts` builds the clerk's `filed` binding from `ballot(api, contestId)` and carries the count and only the first filer's name, while the race page lists every candidate it reads from the race's filers; the clerk's line reads one name where the count is larger.

**Fix.** Make `filedFor` in `src/bench/filing.ts` and the page read the same candidate list, and have the clerk's line use the count (the first name and how many more), not the first name alone; the line stays in the English engine's bank.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Wire to the world: the clerk and the page are two views of one candidate list, never two counts, so every figure a player sees agrees.

**Done when.** A second session plays a drawn place, McMinnville TN (place key 4745100) filing on or after June 21, 2026, on main by presses only and sees the clerk's count of the field equal to the number of other candidates the race page lists.

**Waits on.** Nothing.

**Files.** src/bench/filing.ts

**Notes.** Account lead, Nov 16. The walk and its screenshots are in /mnt/project-files/account-lead/reports/run-for-office-played.md.
