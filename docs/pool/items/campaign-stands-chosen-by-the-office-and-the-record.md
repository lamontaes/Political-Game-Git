---
id: campaign-stands-chosen-by-the-office-and-the-record
title: "A candidate's stands are any of the level's questions and budget lines, the same for a coroner as for a council seat, with no reason from their own record"
area: elections
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: governing
model: opus
effort: high
root: none
milestone: play-first
source: "Owner's sitting 2026-11-23-1, rows P28 and C11, and his answer to Desk question 3 (CTO comment 7117967924 on #9747); traced by the Dead stops tracer (lane 5), Nov 24"
---

**What.** The owner, Nov 23 (P28): "Elections. Again, just random for and against. Why is this no assignments or anything?" His answer that evening: "i meant assignments as in random issues and stances with no reason why those are chosen." A candidate shows only the stands they actually run on, chosen from their own record and from what the office can do, and a council race never shows federal questions or budget category names. On v0.114.0 the Elections screen listed stands like "Natural resources: For" and "ELEMENTARY AND SECONDARY EDUCATION: For" (C11).
Seen: the stands under each candidate on the Elections screen's race page.

**Cause.** Measured: at Auburn, Kentucky (2102638), seed eefe8deb292b1f7ba6f908887043c39056dc4eddcc242803cbad0f6a293ea0ce, and Falmouth, Maine (2324480), seed 0544b107ec5836bcb724e6238f14bddf4f383911e5515d5b69b047fdea1dd53b, by a script on main 550dead8 that builds each world with `buildBenchWorld`, advances it by weeks until its local races have filers, and reads `localRaces` (src/bench/government.ts:493). Every local seat ran on the same kind of list whatever the office does. Auburn's coroner ran on partnering with federal immigration enforcement and more for police and corrections. Its county clerk ran on police, immigration enforcement and less for welfare and Medicaid, and its county treasurer on natural resources, housing and health and hospitals. Falmouth's county assessor ran on police, welfare and Medicaid and administration, and its sheriff on housing and health and hospitals. Of the 15 candidates' 45 stands, 33 were budget lines (`budget-line:<line>`, which the screen prints as the budget category's name). Found in code: the Elections page shows each filing's `platform` as filed (src/bench/government.ts:556-562). Every platform comes from one chain. `contestPositions` (src/core2/contest-positions.ts:79) offers every policy question the seat's government level may decide (`levelMayDecide`, line 95), then every spending line of that level's latest budget (`budgetPositions`, lines 68 and 98). It reads only `office.level` (lines 89-91), never what the office itself does, so a coroner, a clerk, a treasurer, a sheriff and a council seat of one county get the same list. `candidatePlatform` (src/core2/campaign-stances.ts:456) keeps the top three (`candidacyPlatformQuestions`, src/core2/data/candidacy/parameters.json) by conviction times the electorate's support. The term that would tie a stand to the candidate's own job and votes is a registered stopgap left out (`SG-GOV-platform-record-term-left-out`, campaign-stances.ts:398). So nothing in the filing says why a stand was chosen, and the filing keeps no reason. No federal-only question appeared in a local platform: `levelMayDecide` already keeps those out. The questions that read as federal (partnering with federal immigration enforcement) are ones the question data lets a town or county decide. A second derivation also exists: `composeCampaignSpeech` (src/director/local-speeches.ts:172) recomputes the platform instead of reading the filing's.

**Fix.** Keep one chooser, `candidatePlatform` fed by `contestPositions`, and make both read the office and the record. (1) `contestPositions` reads what the office can do, not only its level. A seat on a body that votes the budget and ordinances (`bodyOf`, src/core2/modules/legislature.ts:3260) and the level's executive keep their government's questions and its budget lines. A row office (clerk, assessor, treasurer, coroner, sheriff, prosecutor) offers only the questions and budget lines of its own work, from a data table of office kinds to policy areas and budget lines, built from research (`researcher`), never a list in code. (2) The record term that ties a stand to the candidate's own job and votes is part 2 (campaign-stands-chosen-by-the-office-and-the-record-part-2-record-term). (3) The filing keeps, for each stand, the record that raised it (the office power, the job or vote, the town's support) so the screen can say why (Ask why). (4) `composeCampaignSpeech` reads the filing's platform instead of choosing again. The screen's words for a stand (no category names, no subheadings) are lane 3's (Person card), not this item.

**Time box.** 4 hours for one Opus session; the office-area table is a Sonnet research pass inside it.

**Rules.** One rule, all 56 places: what an office may run on comes from the office kind's data row and the place's law, never from a named place. Ask why: every stand on a filing names the record that put it there, and the proof prints it. No dice: which stands a candidate runs on stays their conviction, their record and the town's support, never a roll.

**Done when.** A second session builds a played world in a drawn place on main after the merge, advances it until local races have filers, and opens the Elections screen. No row office (clerk, assessor, treasurer, coroner) lists a stand outside its own work, and a council or board seat lists only questions its body may decide. Every stand's filing row names the record that raised it. It records the place, the seed, three filings' record ids with their stands and reasons, and a screenshot at 1440x900. A test over drawn places fails on 550dead8 for a coroner or treasurer running on a welfare or natural-resources budget line.

**Waits on.** Nothing. The screen's wording of a stand waits on lane 3's plain-words fix.

**Files.** src/core2/contest-positions.ts, src/core2/campaign-stances.ts, src/core2/modules/candidacy.ts, src/core2/modules/elections.ts, src/director/local-speeches.ts, src/core2/data/campaigns/office-areas.json (new)

**You will see.** Each candidate on the Elections screen runs on a few stands that fit the office and their own life, each with a reason.

**Screenshot.** A local race's page on the Elections screen with its candidates' stands, from a drawn place, with the place and seed under it.

**Notes.** `campaigns-local-platform-budget-lines` (done) added the budget lines so a town in a state that preempts every question still has something to run on. This keeps them for the seats that vote a budget. The mayor's federal stances on his card (C10: immigration, the federal minimum wage, Medicare) are his views, not a filing's platform, and belong to lane 7. A third place drawn in the same run, Nu'uuli, American Samoa, had no local races.
