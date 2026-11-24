---
id: world-police-patrol-and-grievance-causes-part-1-patrol-hours
title: "A town keeps a monthly patrol-hours record that follows the police department staffing and budget line"
area: world
kind: feature
priority: 3
size: M
status: merged
standard: 2
claimed-by: claude/fable-b4-patrol-hours
pr: #8230
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: design-movements-and-unrest
source: split from world-police-patrol-and-grievance-causes in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-10T19:57:37.451Z
merged-at: 2026-11-13T02:24:27.074Z
---

**What.** No module records how many hours a town's police are on patrol; the police department is only staff and a budget line. Add a monthly patrol-hours row per place: the paid hours of the staff whose post resolves to the police line through `lineForPost` (src/core2/budgets-treasury.ts), so that cutting or raising the police line, and the hiring or leaving of officers, changes the hours the next month. Follow src/core2/modules/crime.ts for the module pattern. This is the first of three parts of world-police-patrol-and-grievance-causes.

**Cause.** Design: docs/design/proposals/movements-and-unrest-2026-10-14.md (unrest and incidents arise from conditions that reach officials) and the owner's Oct 16 ruling in docs/coordination/OWNER-DECISIONS.md that the crime engine comes later, now met by src/core2/modules/crime.ts. No module keeps patrol hours; src/core2/data/budgets/treasury-spending.json maps the post service:police to the police line.

**Fix.** Add a module that writes one patrol-hours row per place and month (id patrol:<place>:<month>) from the hours of staff on the police line, with the police budget line's amount as its limit, and an accessor that returns the row. Counted groups carry no police staff of their own, so the row stands for the whole place.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: patrol hours follow the department's recorded staff and budget, never a roll. An effect is a read, not a record: part 3 reads the row. Speed: written once a month per place, read by index. One rule, all 56 places: the police line comes from the post-line table, no place named.

**Done when.** A second session, on main in a drawn place (place and seed named), amends the police budget line in dev mode, plays two months, and sees the place's patrol-hours row change by record id in the direction of the staff paid. A test in src/core2 names the place, the seed and the row ids.

**Waits on.** Nothing.

**Files.** src/core2/modules/police-patrol.ts (new), src/core2/budgets-treasury.ts, src/core2/data/budgets/treasury-spending.json, src/core2/modules/budgets.ts
