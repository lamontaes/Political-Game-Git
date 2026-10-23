# Prior rulings: justice, corruption, officials and the wider population

Current as of 2026-10-23 (a frozen digest of the owner's Drive rulings; later rulings in OWNER-DECISIONS.md win)

Research only. Searched the owner's Google Drive (23 `fullText contains` searches, pageSize 15) and read the 10 most relevant files in full or in part. Entries marked **[snippet]** come from a Drive search snippet, not a full read. The repository rule `AGENTS.md` (owner, Oct 11, 2026) is included because it governs the same questions; it is not a Drive file.

Searches run: court, courts, judge, trial, prison, sentencing, bail, corruption, bribe, scandal, ethics, staff, aide, appointment, cabinet, official, population, counted, two-level, registered voters, generated, simulated, husk.

---

## Rulings, newest first

**1. 2026-10-13 · MEMORY-FLAT: a town costs tens of megabytes, not a gigabyte (Drive, read)**

> "The residents runtime keeps the seed, the counts, the household records it already derives, and which households were filled in. It does not keep input. Fill-in of a counted household regenerates it from the seed … and the regenerated person must match the records (the two-level rule)."

Binds: population. Counted residents are not kept as stored rows or as a generated opening. A person filled in later is regenerated from the seed, matches the records, and comes back the same on a second fill-in. Counted voters vote as voter groups, not per-person rows. Says "Keep the generated opening anywhere, under any name" is forbidden. The doc counts "291 full people, 1,270 husks" in the town.

**2. 2026-10-11 · Keep it simple (owner), in `AGENTS.md` (repository, read in context)**

> "Full individual people exist only where they matter … Everyone else is the modeled wider population (counts by place, age, job and household, plus voter groups), filled in as a full person the moment the player meets or clicks them, seeded from the world so the same person comes back every time."

Binds: the two-level population rule. Bookkeeping, validation and copying run in tests and the bench, not in play. Save "why" reasons only for the player and the people they deal with. A filled-in person must match the records.

**3. 2026-10-08 · 00s PACKAGES — big assignments (Drive, modified Oct 10) [snippet]**

> "every fix covers all 56 places … through ONE shared path; NO hand-written player text … nothing hardcoded … never block on missing data … no dice; American English only; saves don't matter."

Binds: every package session. One rule for all 56 places; no hand-written player text; no dice; missing data is estimated, not blocking.

**4. 2026-10-06 · b13 Judge play (Drive, read)**

> "Judge play: cases as scenes, rule within law and philosophy, appealed, reported, remembered." Fixed: "zero dice; nothing blank or placeholder (estimate from similar places, mark it); one rule for all 50 states, D.C. and territories."

Binds: the player on a bench decides their own rulings. Build step 1 says "if the judge is the controlled person, do not evaluate: leave the case pending on the docket" and "Must not auto-sentence a seated player." Judges' outlooks come from recorded rulings and life events, not a timer. `REVIEW_YEARS = 3` is a placeholder marked "owner-banned, must go." No appeal odds or fixed reversal rate.

**5. 2026-10-06 · b14 Corruption (Drive, read)**

> "Corruption: anything real (bribes, kickbacks, steering contracts, cronies); caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll."

Binds: no detection roll, audit chance or "percent caught." Knowers decide whether to talk; prosecutors decide with the shared decision evaluator, not the fixed `regulatorRefers` rule. Must not build a corruption score or a fixed share of corrupt officials.

**6. 2026-10-06 (owner ruling of Oct 5) · b26 Scandals and your press record (Drive) [snippet]**

> "Owner ruling Oct 5: personal-life scandals are IN from the start … The fixed 300/150 basis-point scandal penalty is DELETED."

Binds: scandal consequences come from what is provable and who hears it, not a fixed vote penalty.

**7. 2026-10-06 (owner ruling of Oct 5) · b15 Investigations and opposition research (Drive) [snippet]**

> "Oct 5: corruption 'caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll.' Lies 'found out by anyone with contradicting facts; damage by who and their personality.'"

Binds: same as item 5, plus lies are found out by contradicting facts and damage depends on who hears them.

**8. 2026-09-29, 11:49 a.m. · 03 CTO RULINGS: CORRECTION FROM LAMONTAE, starting numbers and registration (Drive, read)**

> "Registered voters come from the game's own population … The registration share starts from the real average as a moving anchor … and the world moves it … No hard-coded state total. The same rule applies for turnout."
> "Realism means the world OPERATES realistically (real rules, real mechanisms, real calendars). It does not mean matching today's real numbers."

Binds: registered and voted counts come from the world's own people and move with laws, moves, aging, deaths, purges and registration drives. This replaces item 4 of the 11:46 a.m. rulings (text not in the files read). The Kentucky December start date stands.

**9. 2026-09-29, 12:15 p.m. · 03 HAND-BACK, Build 27 FINAL: courts can now strike down laws (Drive, read)**

> "HARDWIRED: a majority of sitting justices strikes a law, and an even split leaves it standing." "DECIDED: each justice's vote on a challenged law, through the shared decision evaluator with no roll." "A sitting member of Congress can no longer be named Chief Justice."

Binds: an implementation report, not an owner ruling. Court review of challenged laws is built (PR 1080, draft, not merged). The reviewing court is the state's highest court. A court reads only rulings decided by its own date. Remaining dice to remove: the voters' share draw on a state amendment and the rest in `presidential-turnover.ts`.

**10. 2026-09-29, 7:50 a.m. · 03 HAND-BACK, Build 20 FINAL: appointments and patronage [snippet]**

> "Appointers now choose from people they know, and a council vacancy goes to someone a council member or the mayor knows. Employers list work when it comes open and hire the best-placed applicant."

Binds: implementation report. Appointments and hires follow the record of who knows whom. Town jobs turn over at the measured national rate, chosen by the record.

**11. 2026-09-28, 11:54 p.m. · Claude CTO rule on public jobs (Build 20 hand-back, Drive, read at 10:50 p.m.; 11:54 p.m. ruling [snippet])**

> "Rutan v. Republican Party of Illinois, 497 U.S. 62, decided June 21, 1990 … It bars hiring, promoting, transferring or recalling public workers for their party or political support, in every state."
> "rule 5, passing on Lamontae's note: a hire is not automatically a favor."

Binds: lawful town jobs (police, clerks) write no favor. Appointments to policymaking posts write favors. Under Rutan, handing out public jobs for politics is not a game mechanic, so the code does not build it. The owner's 9:35 p.m. note (not read) named public jobs as a source of power; see Conflicts.

**12. 2026-09-28, 10:32 p.m. · 03 CTO RULINGS, ADDENDUM: Lamontae's corrections (Drive, read)**

> "No value shows UNKNOWN … Nothing's unknown, just use deviations of the averages and the game's engine should be able to figure that out. Remember the simulation decides stuff, not coding."
> "Exact only where it's recognizable." "One rule for every place. Never single out a state in a rule."

Binds: every team. A value not read for a place starts from the real average for similar places with a realistic spread, marked ESTIMATED FROM AVERAGE. Never zero, never a blank. An unread legal rule starts from the most common real rule. A pending amendment in any place starts not in force. Build 12's pension share is overruled to a national average with spread.

**13. 2026-09-28, 8:35 p.m. · Research 4 ruling on pardons and redistricting, CTO recording Lamontae's decision (Drive, 8:44 p.m. update) [snippet]**

> "Decided by Lamontae, recorded by the CTO at 8:35 p.m.: track race and language from Census data for places and use it the way courts do, as place data and never a label shown on a person."
> "Decided: pardons start with people the game convicts."

Binds: pardon requests start with people the game already convicts. Race and language are place data only. The design waits for Lamontae's approval and is not to be built yet.

**14. 2026-09-28, 3:21 p.m. · Investigations and opposition research: design checkpoint (Drive, read; proposal only)**

> Owner decisions it cites: "Investigations: federal, state, congressional and local investigations should take place." "Investigations are mostly delegated." "Opposition research: it depends on who finds something and whether they care."

Binds: proposal, not built. "Nothing is built before approval." Open owner questions: impeachment and expulsion in the first build; whether a published story costs votes before any finding; whether the player can lie under oath; whether investigator play (reporter, prosecutor, committee chair) comes first or later.

**15. 2026-09-27 · WAVE · TEAM B · Judiciary, step 1 (Drive) [snippet]**

> "courts everywhere, seated judges who are real people, the five philosophy dimensions, and court size, terms and retirement ages as law-changeable rule fields."

Binds: the shared court model. Unsourced numbers are marked placeholders. Judges show as people.

**16. 2026-09-27 · WAVE · TEAM C · People are people (Drive) [snippet]**

> "For every adult life that opens, and for the people around the player … in full; everyone else stays compact until contact."

Binds: at the time, full lives for every adult that opens. Superseded in part by item 2 (Oct 11, two-level rule); see Conflicts.

**17. 2026-09-23 · CODEX HANDOFF: Consequences for corruption and laws (Drive, read)**

> "The owner said on 2026-09-23 that jail must not be 'caught twice means jail'. It must depend on evidence, the prosecutor and any plea, with jail as one outcome among several."

Binds: criminal referral and jail depend on evidence, the prosecutor and any plea. A case ends as dismissed, acquitted, plea or convicted. A jail sentence removes the person from every office they hold. A jailed candidate stays on the ballot but cannot campaign. The handoff's "referral is a chance based on standing findings" is superseded by item 5 (no detection roll).

**18. 2026-09-23 · CODEX HANDOFF: Committees, staff and appointments (Drive, read)**

> "The transition should be a real transition. The player meets people and decides whom to hire, and hiring involves picking the right people, weighing potential against experience, and playing politics."

Binds: the player hires staff from people met during the transition. Appointments list is not to be offered until research comes back (superseded in part by item 10).

**19. 2026-09-22 · "Local Elementary School" — what a generated childhood is named (Drive) [snippet]**

> "I am completely fine with the generated schools. You can do a county one … As long as they're realistic."

Binds: generated school and county names are allowed when realistic.

**20. 2026-09-22 · OCD ETHICS FINDING ELECTORAL MAGNITUDES (Drive) [snippet; older]**

> "Keep the current 300-basis-point, 150-basis-point, and six-year effects marked unverified; do not present them as researched magnitudes."

Binds (at the time): the finding penalty is unverified. Superseded by item 6 (deleted Oct 5); see Conflicts.

---

## Conflicts

**C1. Finding and scandal vote penalty.**

- Older, 2026-09-22 (item 20): "Keep the current 300-basis-point, 150-basis-point, and six-year effects marked unverified."
- Newer, 2026-09-28 (item 14): "The existing finding penalty stays and adds to it."
- Newest, 2026-10-05/06 (item 6): "The fixed 300/150 basis-point scandal penalty is DELETED."
- Winner by rule: Oct 5 deletion. The Sept 28 checkpoint predates it, so its "stays" line is stale. Flag: confirm the investigations design is revised before any build.

**C2. Detection and referral chance versus no-dice rule.**

- Older, 2026-09-23 (item 17): "Referral is a chance based on standing findings."
- Newer, 2026-10-05/06 (items 5 and 7): "No detection roll." And the no-dice rule (item 4, item 3).
- Winner by rule: no roll. Flag: the Sept 23 code, as described, still rolls for referral. This is a defect against the owner rule.

**C3. Unknown values.**

- Older, 2026-09-23 (item 17): "Every magnitude that has not been researched is a marked UNRESEARCHED placeholder."
- Older, 2026-09-28 investigations checkpoint (item 14): "the number of local officials is UNKNOWN."
- Newer, 2026-09-28 10:32 p.m. (item 12): "No value shows UNKNOWN." And 2026-10-06 (items 4 to 7): "estimate from similar places, mark it."
- Winner by rule: the addendum and the Oct 6 rule. Flag: the UNRESEARCHED wording still in the Sept 23 handoff and the UNKNOWN in the Sept 28 checkpoint are stale.

**C4. Public jobs and appointments.**

- Older, 2026-09-23 (item 18): "Appointments: nothing is built. Wait for ChatGPT's answer before offering any list of offices."
- Older, 2026-09-28 9:35 p.m. (owner note, not read): names "public jobs and contracts as a source of power."
- CTO default, 2026-09-28 10:50 p.m. (item 11): public jobs are not favors, under Rutan.
- Newest, 2026-09-28 11:54 p.m. (item 11): "a hire is not automatically a favor." Relayed by the CTO, passing on Lamontae's note.
- Winner by rule: the Sept 28 11:54 p.m. rule and the Sept 29 Build 20 build (item 10). Flag either way: the owner's own 9:35 p.m. note, which wanted public jobs as a power source, was not in the files read. The Rutan default is a CTO reading of law, not an owner ruling. Confirm with the owner that the Rutan default is his call.

**C5. Full lives versus the two-level population.**

- Older, 2026-09-27 (item 16): "For every adult life that opens … in full."
- Newer, 2026-10-11 (item 2): "Full individual people exist only where they matter … filled in as a full person the moment the player meets or clicks them."
- Newer still, 2026-10-13 (item 1): "Keep the generated opening anywhere, under any name" is forbidden.
- Winner by rule: Oct 11 and Oct 13. Flag: the Sept 27 Team C instruction builds the opposite; treat it as superseded.

**C6. Is there an electorate at all?**

- Older, 2026-09-22 "What reaches what" (superseded in its own title): "A few hundred simulated people are the entire cast … An election is computed from neither … with no electorate anywhere in the game."
- Newer, 2026-10-13 (item 1): counted voters, voter groups and "40,000 generated people" in the opening.
- Newer, 2026-09-29 (item 8): registered and voted counts come from the world's own population.
- Winner by rule: the newer population model. The Sept 22 entry is superseded.

**C7. Court review of laws (Research 9 question versus Build 27).**

- Research 9 (2026-09-28, Drive) recommended that Supreme Court rulings be simulated "in a later step" and asked the owner to decide. No owner answer was found in the files read.
- Newer, 2026-09-29 (item 9): Build 27 built court review of challenged laws.
- Winner by rule: the newer build. Flag: no owner ruling found; the build went ahead before the question was answered.

**C8. Voter registration (replaced ruling).**

- Older, 2026-09-29 11:46 a.m.: item 4 on voter registration (text not in the files read; it is named as replaced).
- Newer, 2026-09-29 11:49 a.m. (item 8): registration from the game's own population, no hard-coded state total.
- Winner by rule: 11:49 a.m. Flag: the 11:46 text should be read before the rule is cited again.

---

Method: 23 Drive searches, 10 files read (items 1, 4, 5, 8, 9, 11, 12, 14, 17, 18), the rest from search snippets and marked as such. Dates are the dates written inside each document where given, otherwise the Drive date. Nothing was edited outside this file.
