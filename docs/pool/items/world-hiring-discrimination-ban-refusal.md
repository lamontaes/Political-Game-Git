---
id: world-hiring-discrimination-ban-refusal
title: "Hiring reads the discrimination ban: a decision whose recorded reasons cite a protected trait is refused, and the job-change record carries the law reason"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-hiring-bias-reasons
lead: jobs
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** Make the hiring step in jobs.ts read the discrimination ban when it picks. In `runWeek` an employer offers its best-placed applicant; when world-hiring-bias-reasons has recorded the owner's reasons for that pick, check whether the employer holds an open discrimination reach row (written by `writeRows` in src/core2/law-reach/group-a-records.ts for the law key us-policy-positions with the employers spec) and whether the recorded reasons cite a protected trait. If both hold, the offer is refused: the employer moves to the next applicant, and the refused applicant's job-change record carries the law reason and the reach row's law id. In a place with no ban in force the same decision stands and the record is unchanged. The refused applicant learns why from the record (not from a form), which is what justice-discrimination-complaint reads. Seen: the bill card for a discrimination ban, which names the hires it refused (owner, Oct 24 and Oct 26: "I said yes").

**Cause.** Found in code: src/core2/jobs-age-bias.ts already lifts the age penalty when the ban-discrimination law is in force (DISCRIMINATION_KEY), but the hire loop in src/core2/modules/jobs.ts (runWeek, line 3078) has no refusal citing recorded reasons; the registered stopgap SG-GOV-REACH-A-discrimination in src/core2/data/stopgaps/gov.json is open.

**Fix.** When a recorded reason cites a protected trait and the ban is in force, refuse the offer, move to the next applicant and record the law and reach row ids on the job-change record; narrow SG-GOV-REACH-A-discrimination to rentals and update its row text.

**Time box.** 5 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the reach row is read at the moment of the hire, and the refusal is read by the next applicant's turn and by the complaint. No dice: refusal follows from the law row and the recorded reasons. One rule, all 56 places: the ban comes from the place's law data, not from code that names a place. This is a game, not a spreadsheet: the applicant meets a refusal as a story line told by the English engine, never a form. Replace, never layer: the employer half of SG-GOV-REACH-A-discrimination is narrowed to rentals. Ask why: the refusal answers why by reasons record, law id and reach row id.

**Done when.** A second session (not the builder) runs a test in src/core2/jobs.test.ts and a one-year world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), and sees an applicant whose pick cited a protected trait in a place with the ban get a job-change record carrying the law reason and reach row id while the employer's next applicant is hired, the same decision stand in a place without the ban, and the stopgap row name only rentals. On screen: nothing yet; it would show on Politics, Issues and Government, and nothing there reads it.

**Waits on.** world-hiring-bias-reasons (which in turn waits on world-employer-attitude-table).

**Files.** src/core2/modules/jobs.ts, src/core2/law-reach/group-a-records.ts, src/core2/jobs-age-bias.ts, src/core2/data/stopgaps/gov.json, src/core2/jobs.test.ts

**Notes.** Split from world-sale-eligibility-reads (an L item) on Oct 19; the owner's ruling is in docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)": the owner's traits and views read against the applicant's record, with the reasons recorded; a discrimination ban refuses a decision whose recorded reasons cite a protected trait. Stopgap SG-GOV-REACH-A-discrimination.

Oct 20 (pool feeder): spec written; after world-hiring-bias-reasons (claimed), which in turn waits on world-employer-attitude-table (open); the refusal has nothing to read until reasons exist. The reach rows for employers already exist as laws apply (group-a-records.ts); no new law data is needed.
