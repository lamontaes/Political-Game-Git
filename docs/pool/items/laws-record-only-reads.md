---
id: laws-record-only-reads
title: "Give the eleven record-only laws their reads (SG-GOV-REACH-A-*)"
area: laws
kind: wiring
priority: 1
status: claimed
claimed-by: claude/laws-record-only-reads
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

**Session note (Oct 15, claude/laws-record-only-reads).** Local authority: the council's authority check already reads the state's home-rule law (`policy-authority.ts`), so its stopgap is closed and the generic record removed. The other ten were re-checked against src/core2: no engine records a police-stop complaint, juvenile routing, a carried weapon, a handgun sale, a self-defense case, a protected trait in a decision, an unplanned pregnancy, a minor account, a facial-identification request or a data request. Each stays registered with that reason in its stopgap row. Each needs the engine named in its row first (justice cases beyond bribery, person-level sales, unplanned pregnancies); see `laws-stopgap-reach-group-a-missing-mechanic`.
