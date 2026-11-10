# School stand-ins, checked (Nov 10, 2026)

Register: `src/core2/data/stopgaps/school.json`. Fourteen rows: one already resolved (SG-SCHOOL-college-completion, left alone) and thirteen open, all checked below.

**Counts.** Still faked: 13. Already replaced: 0. Partly replaced: 0. Could not tell: 0. Closes by code: 11, research: 1, data: 1, design: 0, owner call: 0. New pool items: 2. No register edits (nothing was replaced); the register's line numbers are stale for several rows (see evidence).

| Stand-in                                    | Still true? | What closes it | Pool item                                                    | Size | May stay at early access?                            | In plain words                                                                                                                                                    |
| ------------------------------------------- | ----------- | -------------- | ------------------------------------------------------------ | ---- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SG-SCHOOL-college-decided-at-graduation     | Still faked | code           | none                                                         | M    | Yes, a sourced national share (milestone M7)         | A graduate's college enrollment and degree are both decided on graduation day from national shares, not year by year.                                             |
| SG-SCHOOL-college-stock-ledger              | Still faked | code           | web-college-completion-stock-not-accumulated (open)          | S    | No, it is the one open build for the degree share    | The share of adults with a degree is still a fixed number the game adjusts, not a count of the degrees graduates earned.                                          |
| SG-SCHOOL-equalized-funding-budget          | Still faked | code           | school-spending-per-student-follows-law-and-enrollment (new) | M    | No                                                   | The equal school funding law does not change what the town spends on its schools.                                                                                 |
| SG-SCHOOL-hispanic-enrollment               | Still faked | code           | none                                                         | L    | Yes, it is a marked number that only one law moves   | The share of students who are Hispanic is a bookkeeping number, not counted from enrolled students.                                                               |
| SG-SCHOOL-links-not-running                 | Still faked | code           | none (police and homicide parts wait on the crime system)    | L    | Yes, six small effects with no recorded cause        | Six researched effects on grades (lead, heat, carbon monoxide, shootings, killings, immigration status) do nothing because the game does not record their causes. |
| SG-SCHOOL-switch-window                     | Still faked | code           | none                                                         | L    | Yes, the main cost of switching schools applies      | A student who moves into town mid-year loses a set amount in math, but classmates feel nothing and a move inside town counts for nothing.                         |
| SG-SCHOOL-counted-attendance                | Still faked | code           | none                                                         | M    | Yes, it orders students and never sets how many pass | Students who are not individually modeled attend as the average student in their town does.                                                                       |
| SG-SCHOOL-spending-line-for-per-pupil       | Still faked | code           | school-spending-per-student-follows-law-and-enrollment (new) | M    | No                                                   | School spending's effect on graduation ignores a town gaining or losing students.                                                                                 |
| SG-SCHOOL-honors-no-history                 | Still faked | code           | none                                                         | S    | Yes, only the first year is slightly off             | Every town starts owing no spelling bee or college signing honors from earlier years.                                                                             |
| SG-SCHOOL-honors-athletic-ability           | Still faked | code           | none (waits on a body and sports record)                     | L    | Yes, traits only rank seniors; the count is real     | Which seniors sign to play college sports is ranked by grades and personality because the game has no athletic ability.                                           |
| SG-SCHOOL-honors-one-signing-day            | Still faked | research       | research-school-signing-periods (new)                        | S    | Yes, only the date is off                            | All college sports signings for a class happen on one December day.                                                                                               |
| SG-SCHOOL-honors-every-district-holds-a-bee | Still faked | data           | none                                                         | M    | Yes, one winner a town is a fair estimate            | Every town holds one spelling bee a year and crowns one winner, though real towns vary.                                                                           |
| SG-SCHOOL-class-size-cohort                 | Still faked | code           | none                                                         | L    | Yes, a marked estimate from the ratio                | Class size is guessed from students over teachers, because no kindergarten-to-third-grade classrooms exist.                                                       |

## Evidence

Git history here is one squashed commit (09a28996), so no replacing PRs exist; no row was replaced.

- college-decided-at-graduation: `decideCollege`, src/core2/school-outcomes.ts:676 marker (register says 526); enrollment and completion decided in one call on graduation day with the NCES shares. Scope: owner's Oct 10 call is play-first; M7 allows a sourced estimate.
- college-stock-ledger: src/core2/school-outcomes.ts:678 (register 528); the degrees decided are not summed into school.college-completion-pct; live item web-college-completion-stock-not-accumulated names this stand-in (item read in full).
- equalized-funding-budget: src/core2/school-outcomes.ts:902 (register line 1); `moveBudget` exists at src/core2/law-reach/group-b-money.ts:1554 but no school-funding handler calls it. The link's own note in data/research/outcome-web/links.json:1300 says the same.
- hispanic-enrollment: src/core2/school-outcomes.ts:447 (register 1); the stopgap is registered and no enrollment-by-ethnicity record is read anywhere in src/core2.
- links-not-running: src/core2/school-outcomes.ts:449 (register 1); only the school-move read exists (switchSize at line 458). Police-killing and homicide causes belong to the crime system: waits on the crime system, nothing filed.
- switch-window: src/core2/school-outcomes.ts:451 (register 272); `movedInSince` at line 175, and the math read at lines 520 to 557 applies the size to the student only, not to classmates.
- counted-attendance: src/core2/school-outcomes.ts:252 (register 145); `meanAttendance` returns the place's mean or every day.
- spending-line-for-per-pupil: src/core2/school-budget-line.ts:28; `schoolsLineAboveBase` compares the line to its Census base, with no enrollment term.
- honors-no-history, athletic-ability, one-signing-day, every-district-holds-a-bee: src/core2/school-honors.ts:276, 278, 279, 280 (markers); `honor.stopgaps` registered at line 281; the spelling-bee row in src/core2/data/school/honors.json says every place's district holds a bee.
- class-size-cohort: `pupilTeacherRatio`, src/core2/school-outcomes.ts:371 (register 477); the tested cohort stands for each of thirteen grades.

Speed: the new build item reads the line monthly with the budget in force and counts by place; no daily scan.

## Questions for the owner

None.

## Reuse check (owner, Nov 10: one money system)

Every new item names the existing function it changes and adds no second payment, tax or ledger path: the spending item changes the existing moveBudget handler (src/core2/law-reach/group-b-money.ts) and schoolsLineAboveBase; no second budget path.
