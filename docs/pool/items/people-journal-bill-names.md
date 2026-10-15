---
id: people-journal-bill-names
title: "The officeholder's journal names a bill by its real name"
area: director
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: words-bill-name-and-text
source: "found by people-officeholder-journal"
---

**What.** The officeholder's journal tells a vote as "I voted for Ordinance 2025-1.", naming the bill by its designation. Once a bill has a real name (the pool item words-bill-name-and-text, `billNameFor` in `src/english/bill-names.ts`), the vote line should name it ("I voted for the Missing Middle Housing Ordinance.") and fall back to the designation only where no name is authored.

**Rules.** No hand-written player text: the name comes from the bill-name data, the line from the journal bank. An effect is a read: the journal reads the bill's recorded question and form at the moment it writes. Ask why: the line still cites the act record and the bill id. One rule, all 56 places: no place named in code.

**Done when.** In the officeholder journal test (`src/director/journal-office.test.ts`) in a drawn place, the vote line carries the bill's authored name for a bill drafted from a catalog policy question, and the designation for one with no name; the test names the bill id and the act id.

**Files.** src/director/journal.ts, src/english/bill-names.ts, src/director/journal-office.test.ts

**Notes.** Found by people-officeholder-journal (PR #4511). Waits on words-bill-name-and-text.
