---
id: director-small-child-cast-to-tell-adult-news
title: 'A 4-year-old son "has been reading who filed for town board member" and tells his mother "Kiara, sit down a second"'
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** Commack, New York (creator life, age 29, bench seed 84f2626c-06e2-4b64-95cc-ab59382b866b, main 5e68cde1). On Feb 4, 2025: "Oscar Wise has been reading who filed for town board member before you did." / "Kiara, sit down a second. Before you filed, incumbent Idris Rivas put in for town board member." People shows "Oscar Wise / Son · Age 4 / … Born in Commack, New York in 2021." A preschooler reads the filing list and briefs his mother on it.
Seen: the talk at home in which a household member tells the player news from the records.

**Cause.** Found in code: src/director/circumstance.ts `poolOf`, source `own-household` (about line 466), returns every member of the player's household but the player, with no age check. `circumstancePicks` then scores them on tie and sociability, so a close young child can be cast. Every circumstance row that draws on `own-household` (src/director/data/circumstances.json: `rival-known-late`, the news read at home, the race told) can cast a child too young to have read or heard the record.

**Fix.** Cast a person for a circumstance only if they are old enough to know of its record. Add one age floor to the director's parameters (TUNABLE, with its spread) and apply it in `poolOf` to every source. A row whose record a child can know (a birthday, a school year) may lower it on its own row. The `{who}` of the lead and the speaker of the talk come from the same filtered cast.

**Time box.** 2 hours for one Sonnet session.

**Rules.** scene-standard: roles are cast from the world, and the cast must be able to know what they say. One rule, all 56 places: the floor is a parameter, read for every row.

**Done when.** A second session, on main, plays new lives in a drawn place each (creator lives with young children, and 17-year-olds with young siblings) for two months, takes a screenshot of every talk at home, and finds none cast to a household member under the floor. src/director/circumstance.test.ts checks the cast's age on every scene it opens.

**Waits on.** Nothing.

**Files.** src/director/circumstance.ts, src/director/data/circumstances.json, src/director/circumstance.test.ts
