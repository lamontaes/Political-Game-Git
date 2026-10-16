---
id: gov-stopgap-constituent-cases-missing-engine
title: "Stopgaps in constituent-cases (missing-engine): 1 open"
area: gov
kind: stopgap
priority: 3
status: done
claimed-by: claude/case-referral-read
pr: #4575
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/constituent-cases.ts, kind missing-engine"
claimed-at: 2026-10-16T03:17:39.576Z
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/constituent-cases.ts: SG-GOV-case-referral-unread. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/constituent-cases.ts

**Notes.** First row: An official who helps a resident looking for work refers them to the workforce office, but the jobs engine doesn't read the referral when employers pick applicants, so the help changes nothing yet.
