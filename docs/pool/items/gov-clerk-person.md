---
id: gov-clerk-person
title: "A clerk's office has a clerk: a person the filing scene can put in the room"
area: gov
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/gov-clerk-person
pr: #4658
blocked-on:
source: "director-civic-roles, Oct 15 (SG-DIRECTOR-clerk-person)"
claimed-at: 2026-10-16T07:40:03.497Z
---

**What.** The filing visit and any scene at a government counter name an office by its title, but no record says who staffs it: a county clerk, a municipal clerk or a board of elections is a title in the filing data, not a person. Give each filing office a holder, a full person on the town's payroll or an elected holder where the place elects one, so a scene can fill the clerk role from a record. The holder comes from the place's own data, never from a rule naming a state.

**Rules.** One rule, all 56 places: who files where, and who staffs it, comes from the place's records, never a named state. Wire to the world: the clerk's pay is a public payroll record that the budget reads, and the person is a consistent member of the town's counts.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) the filing office for the town's races has a named holder by person record id, the director's clerk fill returns that person for a filing moment, and src/director/civic-roles tests and the stopgap SG-DIRECTOR-clerk-person show it resolved. The owner plays it: file for office and the clerk who answers has a name.

**Files.** src/core2/modules/offices.ts, src/core2/modules/elections.ts, src/director/civic-roles.ts, src/director/data/stopgaps.json

**Notes.** Found building director-civic-roles. The fill in src/director/civic-roles.ts answers poll workers, the press reporter, the chair and the members from records; the clerk waits on this item.
