---
id: laws-family-government-operations
title: "Government operations: independent redistricting and the rest of the family"
area: laws
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: pool/laws-family-government-operations
pr: "#4433"
blocked-on:
milestone:
source: "split of laws-remaining-families (Oct 15)"
---

**What.** Voting, term-limit and lobbying laws already run through the voting mechanic. Independent redistricting (SG-GOV-REACH-A-redistricting) still writes records only. Find which engine draws districts and make it read the law.

**Rules.** An effect is a read; replace, never layer; one rule, all 56 places.

**Done when.** A redistricting event in a played world cites the law row in force, by record id, or the stopgap row keeps the reason there is no districting event.

**Files.** src/core2/modules/elections.ts or the districting code, src/core2/law-reach/group-a*.ts.

**Notes.** Check SG-GOV-REACH-A-redistricting first. (Oct 15) Checked: no code in src/core2 draws a ward or a district, and a game opened in 2026 holds no census until 2030, so there is no districting event to read the law. The stopgap row keeps that reason and points to the new item gov-redistricting-after-census (the b16 design).
