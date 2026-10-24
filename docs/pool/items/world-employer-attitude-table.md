---
id: world-employer-attitude-table
title: "A sourced table of employer callback gaps by group, with a spread per place"
area: world
kind: research
priority: 2
size: M
status: open
claimed-by:
pr: #5805
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

Sent back 2026-10-20 from PR #5191 (branch claude/employer-attitude): Merging current origin/main produces 366 conflicted files, including code in src/core2/modules/jobs.ts, src/core2/modules/press.ts, src/core2/trait-effects/index.ts, src/core2/trait-effects/initial-trust.ts, src/director/office-scene.ts, src/simulation/compiled-trait-packs.ts, tests/golden-path/runner.node-test.mjs and tsconfig.node.json, plus the English news bank and current merger/researcher instructions. Repair this branch against current main with plain commits, preserving the current engines, bank grading and main instructions, then rerun the changed-file gate. This merger cannot hand-resolve those code or English-bank conflicts.; finish on that branch, merge main into it first.
Oct 21 (fixer): sent-back fix. The older-applicants row no longer says a press summary was read; the 18% and 35% figures are stated as unverified (only the abstract was read) and the row stays ESTIMATED with the paper as source.

Sent back 2026-10-21 from PR #5805 (branch claude/employer-attitude-reader): src/core2/data/jobs/employer-callback-gaps.json gives latino-applicants a callbackRatio low 0.7 / high 0.9 with tag SOURCED. The fetched Quillian et al. 2017 paper (https://pmc.ncbi.nlm.nih.gov/articles/PMC5642692/) says white applicants receive 24 percent more callbacks than Latinos, with a 95 percent confidence interval of 15 to 33 percent more. Under the row own inverse-ratio definition, that interval is 1/1.33 to 1/1.15, about 0.752 to 0.870, not 0.7 to 0.9. Use the published/transformed bounds or explicitly label and explain an estimated widened range; a separate ESTIMATED place-spread note does not change the callbackRatio SOURCED tag. The body also admits that the employer-attitude reader and named played-year hiring proof required by world-employer-attitude-table are not built. Track a completed data-only slice separately while keeping the reader work open, or supply the linked acceptance. The Touches prefix does not protect the parent from its current in-pr / pr #5805 completion fallback. No local standard gate pass or hiring-feature completion is claimed.; finish on that branch, merge main into it first.

Oct 23 (fixer, PR #5703): supersedes the Oct 21 note above that said only the abstract was read. The older-applicant row now quotes the paper itself (NBER w21669, printed p. 26, PDF p. 28): about 18% lower callbacks for middle-aged and 35% for older workers; 14.4% for ages 29-31, 10.3% for 49-51 and 7.6% for 64-66. This table still has no engine reader; it waits on the guard's list.
