---
id: gov-justice-incident-records
title: "Police stops, complaints, self-defense cases, juvenile routing and carry permits as justice records"
area: gov
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found while building laws-record-only-reads"
---

**What.** The justice engine only handles officials' bribery cases. Five laws have nothing to read them: police oversight (a complaint against an officer is reviewed by the board), juvenile age (a young adult's case is routed to juvenile court), stand your ground (a self-defense charge and the court read the duty to retreat), facial recognition (an identification needs a warrant), and carry permits (the sheriff issues or refuses a permit). Build the smallest incident record each needs from causes already in the world (a stop, a fight, a carried weapon), then have the prosecutor, court and sheriff read the law in force when they decide.

**Rules.** No dice; an effect is a read; the chain is the acceptance; one rule, all 56 places; estimate, never UNKNOWN.

**Done when.** In a one-year run of the played world, the named engine reads the law at the moment it decides, shown by record id for a named person, and the stopgap row closes.

**Files.** src/core2/modules/ (the owning engine), src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-police-oversight, -juvenile-age, -stand-your-ground, -facial-recognition, -carry-permit. Split out of laws-record-only-reads on Oct 15; Session A had already checked main and found no record to read.
