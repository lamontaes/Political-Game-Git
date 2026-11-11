---
id: world-state-cabinet-posts-draw-agency-lines
title: "A governor's cabinet posts draw on the state's own agency lines, so a cut to a state line has a head to argue it"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: words-and-scenes helper D, Oct 27, from scenes-from-life episode budget-cut-department-head
lead: laws-effects
claimed-at:
checked: fable 2026-11-10
---

**What.** A town's department heads are matched to a budget line by the post-line table (police chief to police, fire chief to fire, public works to highways), so a cut to that line has a person to argue it. A state cabinet post has no such entry: every post that is not a town post falls to the general administration line, so a cut to a state agency's line has no head, and the governor's version of the department-head scene cannot be cast. Give each state cabinet post the state spending line its agency's pay draws on, sourced from the Census function codes already cited in the table, and the county executive's posts the same.

**Cause.** Found in code: `lineForPost` (src/core2/budgets-treasury.ts line 316) takes the longest matching prefix in postLines.lines in src/core2/data/budgets/treasury-spending.json, whose only entries are town:, staff:, office:, job:public-schools: and the five town department posts, so state cabinet posts fall to the administration line.

**Fix.** Add a state spending line for each cabinet post (and county department heads) from the Census function codes, with the administration fallback marked ESTIMATED and a test that lists the posts that still fall to it with their reason.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the governor's department-head scene over a cut to a state agency's budget line, which cannot be cast without a head.

**Rules.** Estimate, never UNKNOWN: a post with no named line keeps the administration fallback and says so. Wire to the world: the line is read by the payroll that caps the post's pay and by the director's department-head cast. Every number lives in a parameter table with its source, so the mapping carries its Census citation.

**Done when.** A second session, on main in a drawn place and a seed the builder did not choose, plays a year in dev mode and finds each seated state cabinet post and county department head resolving to a named spending line other than administration where the Census classification gives one. A test lists the posts that still fall to administration with their reason, and the department-head cast in src/director/civic-roles.ts finds a head for a cut to a state line.

**Waits on.** Nothing.

**Files.** src/core2/data/budgets/treasury-spending.json, src/core2/budgets-treasury.ts, src/director/civic-roles.ts

**Notes.** Read from code, not yet run: lineForPost takes the longest matching prefix in postLines.lines, whose only entries are town:, staff:, office:, job:public-schools: and the five town department posts. Lead laws-effects.
