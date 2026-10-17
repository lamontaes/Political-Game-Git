---
id: gov-council-ward-residency
title: "A candidate for a council seat chosen by part of town lives in that part"
area: gov
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
after: gov-council-election-method
blocked-on:
milestone:
source: "found by gov-council-election-method"
---

**What.** Voters of a ward seat are now limited to their ward, but a resident of any part of town can still file for the seat. Where the charter or the state's law requires a district candidate to live in the district (`data/research/local-government/governing-body-seat-qualification.json`), the filing check refuses a resident of another part, with the recorded reason.

**Rules.** One rule, all 56 places; no dice; no hand-written player text (the refusal reason comes from the English engine).

**Done when.** In a drawn place with ward seats, a filing by a resident outside the ward is refused for its recorded reason, and one inside is accepted, by filing record id.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts

**Notes.** Needs the household-to-part-of-town lookup that `voting.ts` `inWard` holds today; share it rather than copy it.
