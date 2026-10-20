---
id: world-employer-attitude-table
title: "A sourced table of employer callback gaps by group, with a spread per place"
area: world
kind: research
priority: 2
size: M
status: open
claimed-by:
pr: #5191
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The hiring engine needs a sourced table of how much more often employers call back some applicants than others, with a spread between employers, before a hiring decision can cite a recorded attitude (world-hiring-bias-reasons) or a discrimination ban can refuse one. PR #5191 built src/core2/data/jobs/employer-callback-gaps.json from Quillian et al. 2017, Bertrand and Mullainathan 2004, Kline, Rose and Walters 2022 and others, but was sent back because no engine reads it. Finish it with its first reader: each employer's owner is generated with an attitude drawn once from the table's between-employer spread (seeded generation of who exists), and the hiring score in the jobs engine reads it, so the table is not dead data. Tag the older-applicant and Pager 2003 rows ESTIMATED until read from the papers.

**Rules.** An effect is a read, not a record: the table lands only with the jobs engine reading it when an employer ranks applicants. No dice: the per-employer attitude is a generated trait of who exists, and the hire follows from it with the applicant's records, never a roll at the decision. Research before building: every ratio carries its citation and spread, and real callback rates check totals across employers, never one employer's answer.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed the builder did not choose, both named), the jobs engine reads an employer's attitude from the table when it ranks applicants, named by record id, and across all hires the callback gap by group falls inside the table's sourced spread; src/core2/data/jobs/employer-callback-gaps.test.ts checks every row has a source and spread.

**Files.** src/core2/data/jobs/employer-callback-gaps.json, src/core2/modules/jobs.ts, src/core2/data/jobs/employer-callback-gaps.test.ts

**Notes.** Sent back 2026-10-20 from PR #5191 (branch claude/employer-attitude): Morning check failed because employer-callback-gaps.json is not read by any engine in core2; finish on that branch, merge main into it first.

Oct 20 (pool feeder): write-up filled from PR #5191's body and its send-back. world-hiring-bias-reasons (claimed) builds the reasons on top of this reader.
