---
id: gov-justice-incident-records
title: "Police stops, complaints, self-defense cases, juvenile routing and carry permits as justice records"
area: gov
kind: feature
priority: 2
status: in-pr
claimed-by: claude/justice-incidents
pr: #5088
blocked-on:
milestone:
source: "found while building laws-record-only-reads"
claimed-at: 2026-10-19T18:40:21.441Z
---

**What.** The justice engine (`src/core2/modules/justice.ts`) handles only officials' bribery cases, so five laws have nothing to read them: police oversight, juvenile age, stand your ground, facial recognition and carry permits. Build the smallest incident record each needs from causes already in the world (a stop, a fight, a carried weapon, a complaint) and have the prosecutor, the court and the sheriff read the law in force when they decide. The player would notice a complaint against an officer going to a review board, a young adult's case routed by the place's juvenile age, and a carry permit issued or refused by the local sheriff's rules.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do; An effect is a read, not a record: each engine reads the law at the moment it decides, and a recorded flag nobody reads does not count; The chain is the acceptance: follow one incident to the law read, the ruling, the person reached and the journal or scene line; One rule, all 56 places: the law rows are place data for all 56 places, with no place named in code; Estimate, never UNKNOWN: a missing rate or threshold starts from the real average marked ESTIMATED, never UNKNOWN; One model, two tiers: counted people hit the same incident rule as full people times their count; Placeholders: the five SG-GOV-REACH-A rows close only when the engines read the law, never by deleting the rows.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the named engine reads the law at the moment it decides for each of the five laws, shown by record id for a named person, and the five stopgap rows (SG-GOV-REACH-A-police-oversight, -juvenile-age, -stand-your-ground, -facial-recognition, -carry-permit) close in `stopgaps.json`. Tests in `src/core2/justice-incidents.test.ts` (new). Because 'a complaint' and 'a stop' are new records, check the register for what the owner already ruled before adding any player-facing step. The owner plays it: files for a carry permit or lives through a stop and sees the local rule applied.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/justice-chain.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-police-oversight, -juvenile-age, -stand-your-ground, -facial-recognition, -carry-permit. Split out of laws-record-only-reads on Oct 15; Session A had already checked main and found no record to read.

Checked Oct 16 against docs/coordination/DECISION-REGISTER.md: "Unions and strikes; police, the National Guard and war: 1.0 (owner, Oct 14)." Police stops, complaints and oversight are a 1.0 feature, not early access; the carry permit, the juvenile age and self-defense cases are the parts a council or sheriff's race could touch. Suggest the CTO sets this below the early-access golden path or splits the three non-police laws out.
