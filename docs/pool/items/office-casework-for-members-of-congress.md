---
id: office-casework-for-members-of-congress
title: "Casework for members of Congress:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-FEDERAL.md line 21 (unchecked checklist line)"
---

**What.** A member of Congress the player controls has no casework: residents' problems with federal agencies are not routed to members, so the 'office hours' act has nothing to show. GOV's constituent-cases engine (`src/core2/modules/constituent-cases.ts`) already routes problems for local seats, and the federal day needs it extended to House and Senate members, so a resident's lost benefit or immigration problem lands on their member's desk. The player would notice cases from named constituents appearing for him and his office helping or failing, with those people's lives changing.

**Rules.** An effect is a read, not a record: the member's desk reads the case record and the agency reads the member's inquiry at the moment it decides; Ask why: a resolved or failed case keeps the agency's reason by record id; The chain is the acceptance: follow one constituent's problem to the member, the inquiry, the agency's answer and the resident's changed situation; One model, two tiers: counted residents' problems reach members by the same rule as full ones times their count; the player meets only the filled-in ones; No dice: which problems arise follows the people's circumstances and the law, not a roll; One rule, all 56 places: which agencies and routes exist is data for all 56 places' representation; This is a game, not a spreadsheet: no form for the player; the case arrives as a person and a choice; Speed: cases are routed on the day they arise.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): as the town's U.S. representative, the bench player's office hours list cases from named constituents (case, resident and agency ids), at least one resolved by his action and one by his staff, and the resident's later situation reads the outcome. Tests beside `src/core2/office-day-federal.test.ts`. The owner plays it: holds district office hours and helps a family with a stuck benefit.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/office-day-federal.ts, src/core2/modules/office-day.ts, src/core2/data/constituent-cases/

**Notes.** Checklist line from OFFICE-FEDERAL.md; verify against main before starting.
