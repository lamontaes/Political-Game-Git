---
id: office-casework-for-members-of-congress
title: "Casework for members of Congress:"
area: office
kind: feature
priority: 2
status: done
claimed-by: claude/office-casework-congress
pr: #4789
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OFFICE-FEDERAL.md line 21 (unchecked checklist line)"
claimed-at: 2026-10-16T18:30:36.812Z
---

**What.** Checked against main on Oct 16: OPEN. `localOfficials()` in `constituent-cases.ts` lists only council, mayor and state legislators, never the town's US representative or senators, and `problemOf` knows two problems (looking for work, paid under the minimum wage). `SG-OFFICE-FED-federal-casework` is still open. Next: Route the town's constituent cases to its US representative and let the member's staff or the member handle them, changing the resident's situation. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** An effect is a read, not a record: the member's desk reads the case record and the agency reads the member's inquiry at the moment it decides; Ask why: a resolved or failed case keeps the agency's reason by record id; The chain is the acceptance: follow one constituent's problem to the member, the inquiry, the agency's answer and the resident's changed situation; One model, two tiers: counted residents' problems reach members by the same rule as full ones times their count; the player meets only the filled-in ones; No dice: which problems arise follows the people's circumstances and the law, not a roll; One rule, all 56 places: which agencies and routes exist is data for all 56 places' representation; This is a game, not a spreadsheet: no form for the player; the case arrives as a person and a choice; Speed: cases are routed on the day they arise.

**Done when.** In `office-day-federal.test.ts`, in a drawn place (buildBenchWorld, seed named in the PR body), a case record `case:<resident>:<date>` has `officialId` equal to the House member, and handling it changes the resident's pay or job, shown by record ids. The owner plays it: Route the town's constituent cases to its US representative and let the member's staff or the member handle them, changing the resident's situation.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/office-day-federal.ts, src/core2/modules/office-day.ts, src/core2/data/constituent-cases/

**Notes.** Checklist line from OFFICE-FEDERAL.md; verify against main before starting.
