---
id: gov-stopgap-staff-missing-engine
title: "Stopgaps in staff (missing-engine): 4 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/staff.ts, kind missing-engine"
claimed-at: 2026-10-19T23:03:27.093Z
---

**What.** Replace or clear the 4 open missing-engine stopgap row(s) in src/core2/modules/staff.ts: SG-GOV-staff-hire-out-of-work, SG-GOV-staff-unpaid, SG-WORLD-staff-husk-work, SG-WORLD-staff-seat-applicant. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/staff.ts

**Notes.** First row: Officials' automatic hires (an aide at the monthly staff review, a department head refilled at the executive's review) choose only among people out of work, though anyone paid less than the post would apply.

Oct 20: PR #5248 merged and resolved only SG-GOV-staff-hire-out-of-work; the other four rows in this item are still open.
