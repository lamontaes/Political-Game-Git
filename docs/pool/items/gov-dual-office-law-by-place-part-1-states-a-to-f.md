---
id: gov-dual-office-law-by-place-part-1-states-a-to-f
title: "Dual-office rows: States A to F"
area: gov
kind: research
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: split from gov-dual-office-law-by-place in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Compile the constitutional and statutory dual-office prohibitions and exceptions for Alabama through Florida (for example a state legislator who may also sit on a local school board) into `src/core2/data/offices/incompatibility.json`, each row cited by section with its retrieval date, replacing the ESTIMATED conservative row. Where a place's law is not found, keep the conservative rule with a spread note. The reader `incompatibleOffices` already reads the file.

**Cause.** Found in code: `src/core2/office-incompatibility.ts` `incompatibleOffices` reads `src/core2/data/offices/incompatibility.json`, whose state rows are ESTIMATED under stopgap `SG-GOV-dual-office-law`.

**Fix.** Write a SOURCED row for each place in this range (the pairs barred, the exceptions, the citation and retrieval date), or keep the conservative row marked ESTIMATED with the reason; do not change the reader.

**Time box.** 4 hours for one sonnet session.

**Rules.** Research before building: each prohibition is cited by statute or constitution section with its retrieval date. One rule, all 56 places: the pairs live in data per place, never in logic. Estimate, never UNKNOWN.

**Done when.** A second session reads `src/core2/data/offices/incompatibility.json` and sees a row for every place in this range with a citation and retrieval date or an ESTIMATED note giving the reason, and runs `src/core2/office-incompatibility.test.ts` and sees it pass for one allowed and one barred pair drawn from this range.

**Waits on.** Network access to the state statute sites.

**Files.** src/core2/data/offices/incompatibility.json, src/core2/office-incompatibility.ts, src/core2/office-incompatibility.test.ts (new)

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Research citations of dual-office law, seen nowhere.
