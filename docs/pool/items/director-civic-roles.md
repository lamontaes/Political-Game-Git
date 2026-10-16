---
id: director-civic-roles
title: "Fill the civic roles from records: clerk, chair, members, press, poll workers, petitioners"
area: director
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/director-civic-roles
pr: #4516
blocked-on:
source: "director-civic-producers, found building it"
claimed-at: 2026-10-15T23:16:44.101Z
---

**What.** The director binds a scene's roles from records, and its role fills (`fillRole` in scheduling.ts) know only the subject, the counterpart, the household, kin, coworkers and the guardian. The civic situation types name roles the director cannot fill yet: the clerk who takes a filing, the chair who calls a body to order, the members, the press, the poll workers and the petitioners. Add a fill for each from the offices, elections and press records (the person who holds the seat, the clerk office's holder, the outlet's reporter), so a type that needs them is no longer left with an unbound role.

**Rules.** No dice: a scene fires from a recorded cause, never a roll, and a quiet day fires nothing. The chain is the acceptance: each fired scene is traced from its cause record to the scene to the journal line. One rule, all 56 places: a random place and seed from all 56, named. Speed: the ledger acts on the day a record is written, never by scanning the world each day.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a test in src/director/scheduling tests binds each of these roles to named people from record ids for a moment that carries them, and the reach report (src/director/reach.ts) shows no civic type left unbound for want of a role fill. The owner plays it: a scene about a filing has the clerk in it.

**Files.** src/director/scheduling.ts, src/core2/modules/offices.ts, src/core2/modules/elections.ts, src/core2/modules/press.ts

**Notes.** Claimed and released by the session that split it: a role fill can only be proven by a scene that fires with it, so build it together with the first family that needs it (director-civic-producers-electoral needs the clerk and the supporters). Note that filing-visit.ts and polling-place.ts are already dedicated producers for the filing and polling-place types, so the catalog's waiting marks for those two are stale and the reach report should read them as built. Split out of director-civic-producers, which turned out to be larger than one item: the types need roles filled before any of them can fire.
