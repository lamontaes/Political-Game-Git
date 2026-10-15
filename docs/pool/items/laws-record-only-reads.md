---
id: laws-record-only-reads
title: "Give the eleven record-only laws their reads (SG-GOV-REACH-A-*)"
area: laws
kind: wiring
priority: 1
status: in-pr
claimed-by: claude/laws-record-only-reads-012x
pr:
blocked-on:
milestone:
source: "reissue item 1; overnight Session A"
---

**What.** Police oversight, juvenile age, carry permit, handgun age, stand your ground, discrimination, abortion, age verification, facial recognition, data privacy and local authority each get a read (who is marked eligible or barred, what price or payment changes, which decision cites it) or stay registered with the reason the world has no record for it.

**Rules.** No dice; an effect is a read; the chain is the acceptance; one rule, all 56 places; numbers in the parameter table; knowing is a read.

**Done when.** Each law: a different engine reads it at the moment it decides or pays, named by record id in a played year; or the stopgap row keeps a reason the CTO accepts.

**Files.** src/core2/law-reach/*, src/core2/data/stopgaps.json

**Notes.** Pool item 2 of the overnight order.

**Progress (Oct 15, branch claude/laws-record-only-reads-012x).** Read built: data privacy (the business engine's monthly cost review charges employing businesses a share of costs, `readDataPrivacyLaw`), and local authority (home rule was already read by `policyAuthority`; now proven in a generated town, stopgap resolved). Not built, split into pool items because the engine to read them does not exist: `gov-justice-incident-records` (police oversight, juvenile age, stand your ground, facial recognition, carry permit), `world-sale-eligibility-reads` (handgun age, age verification, discrimination), `people-unplanned-pregnancy-decision` (abortion). Those eight stopgap rows stay open with their reasons.
