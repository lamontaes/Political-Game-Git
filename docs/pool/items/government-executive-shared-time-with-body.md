---
id: government-executive-shared-time-with-body
title: "A mayor, county executive or governor knows the members of the body they work with, from day one"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-hkqdh2-executive-ties
pr: 9543
after: legislature-members-have-no-tie-to-each-other
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Account lead, Nov 15, from the desk-visits work (Bedford KY: the mayor and five council members read closeness 0 on day one)
---

**What.** An executive and the body whose bills reach their desk read no tie. At Bedford KY all five council members sit at closeness 0 with the mayor on day one, so the desk rule (a sponsor comes to the executive when the signature is in doubt) sends nobody. Seen: in dev mode, the mayor and council members of a mayor-council town read a tie on day one.

**Cause.** Found in code: the sitting reader (src/core2/sitting-closeness.ts) ties members of one body; the game's records do not say where a mayor presides at or attends council meetings (no row in src/core2/data/offices or data/research), and an executive's other shared time with legislators (leaders' meetings, bill signings, the address) is written only on the player's own office day (`spendTime`, src/core2/office-day-state.ts).

**Fix.** Research who presides at council by state and form of government into a data row, and read the executive into the body's sittings where they preside or attend; where they share no sitting, read the shared time the records hold (signings from the executive acts table, the address) through the same read, with past time on day one. No flat tie.

**Time box.** 4 hours, one Opus session at medium effort, with research.

**Rules.** One rule, all 56 places: whether an executive presides at or attends the body comes from each place's records, never from a named place. Wire to the world: the shared time is read from records the game already keeps, with no flat number.

**Done when.** (Widened by the Account lead, Nov 15 16:27Z; narrowed at his review of #9543, 19:14Z.) A mayor reads a tie with every council member on day one, and a county executive with the county's body where that state's executive presides, from the sittings they share; the conversation reads that shared time as met, so these people never open as strangers; a governor, who sits with no body, shares no sitting with the legislature (the leaders' meeting is government-executive-leaders-meeting-as-sitting, a signing with the sponsor present is scene-signing-casts-who-it-reaches); shown at two named places and one drawn place, and a second session sees it in dev mode on main. A veto is an act apart and gives no shared time; how the next talk reads it is #9489's greeting rule.

**Waits on.** The sitting-ties PR.

**Files.** src/core2/sitting-closeness.ts, src/core2/data/offices, src/core2/modules/world-legislating.ts
