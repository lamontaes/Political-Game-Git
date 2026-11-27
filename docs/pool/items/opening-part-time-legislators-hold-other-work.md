---
id: opening-part-time-legislators-hold-other-work
title: "A part-time legislator holds the other work real ones hold, so the stipend is not their whole income"
area: people
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** A seat that pays a stipend (a citizen legislature, a council) is held by someone who keeps their own job, but a holder the officials module makes on demand arrives with no job at all, so their only income is the stipend and their household reads as living on it. Seen: a part-time legislator's card shows a job and an employer beside the seat. Seen: a part-time legislator's card shows a job and an employer beside the seat.

**Cause.** Found in code: src/core2/modules/office-day.ts lines 1865 to 1880 pay only a full-time seat through startPublicJob and leave a part-time holder to 'keep their own job'; nothing there or in modules/officials.ts gives that holder a job when they have none. Not yet counted in a played world: the builder's first step is to count part-time seat holders with no job record in three drawn worlds and name the share.

**Fix.** Fill the holder in through the jobs engine, as the opening fills any resident: a part-time holder with no job takes one from the jobs engine's open positions by its choice (or a self-employed or retired state from the opening's own rule), at hours the seat leaves free. Read the seat's weekly hours from the pay band (weeklyHours) so work plus seat hours stay inside the week. No second hiring rule.

**Time box.** 6 hours

**Rules.** No dice: who holds work is read from the seat's hours, the holder's age and the jobs engine's open positions, never a roll. One engine: the job is a jobs-engine job. Look at docs/coordination/OWNER-DECISIONS.md and the opening's two-level rule first: holders are named people, filled in to match the books.

**Done when.** A second session, at a drawn place and seed nobody chose, opens the running game and sees each part-time seat holder's card with a job and an employer (or a named reason they hold none), the seat's hours and the job's hours inside one week, and a played year in which their household spending is read from both pays. A drawn-place test counts part-time holders with no job and a reason.

**Waits on.** Nothing.

**Files.** src/core2/modules/office-day.ts, src/core2/modules/officials.ts, src/core2/opening-town-jobs.ts, src/core2/modules/jobs.ts
