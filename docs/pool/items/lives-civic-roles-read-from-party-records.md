---
id: lives-civic-roles-read-from-party-records
title: "A person's civic roles are read from the party records that name them, so they count as a reason to run"
area: people
kind: stopgap
priority: 2
size: S
status: in-pr
claimed-by: claude/project-thread-86yqt4
pr: "#9234"
blocked-on:
source: stopgap plan cluster 29 part 3 (Nov 14, 2026); Account lead ruling A, Nov 14 12:55Z
claimed-at: 2026-11-14T12:56:00Z
after:
lead: elections
standard: 2
model: opus
effort: medium
root: none
checked: account lead 2026-11-14
---

**What.** The candidacy engine weighs a person's civic roles as a reason to run (owner, Nov 8), but nothing ever wrote the `civicRoles` field it read, so no one in any world had one (SG-LIVES-civic-roles-not-recorded). Seen: who files for a town race in an unattended year; a party chair or committee regular now has that pull.

**Cause.** Found in code: `src/core2/opening-roles.ts` `withRoles` only registered the stopgap; `looks.civicRoles` and the counted store's `civicRoles` column were never written, so `candidacyReasons`' `civicRole` term was always 0.

**Fix.** `civicRolesOf` in `src/core2/modules/candidacy.ts` counts the roles the parties engine records: a party's chair here, and a seat at its committee meetings in the last year. The candidacy engine reads it for named people and counted residents by the same rule. The empty field, its counted column, the stopgap call and the row are deleted.

**Time box.** 3 hours for one opus session.

**Rules.** No dice; one rule, all 56 places; read the records, store nothing new.

**Done when.** A second session, in a drawn place with a year played, opens a party's chair and a committee regular and sees their candidacy decision for a town seat list the civic role among its reasons, and an adult with no party role list none.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/opening-roles.ts, src/core2/counted-groups.ts, src/core2/electorate.ts, src/core2/data/stopgaps/lives.json

**Notes.** Pinned test src/core2/civic-roles.test.ts (Edgar WI 5522550, seed civic-roles-1).
