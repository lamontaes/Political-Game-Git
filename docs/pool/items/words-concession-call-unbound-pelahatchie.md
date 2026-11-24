---
id: words-concession-call-unbound-pelahatchie
title: "The runner-up's concession call does not bind in Pelahatchie, Mississippi, so the winner hears no call"
area: words
kind: bug
priority: 2
size: S
lead: words
status: done
claimed-by: words/concession-call-binds
pr: #6745
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T05:26:56.372Z
---

**What.** src/director/concession-received.test.ts fails on main 886c21ab72 with run seed 1828b1406b544cb3 in Pelahatchie, Mississippi (2856200): 'no concession-received binding: expected undefined to be truthy'. The count's moment reaches the winner's schedule, but no concession-received binding is cast on it, so the scene where the runner-up calls the winner does not play there. With run seeds cr-a and cr-b the same test passes. CI runs only changed test files, so a place where it fails is not seen.

**Rules.** One rule, all 56 places: the concession call must bind by the same rule in every drawn place, so the cause is a missing record or cast rule, not the place. Ask why: the fix names the record or cast rule that left the binding empty, by record id.

**Done when.** concession-received.test.ts passes with run seed 1828b1406b544cb3 in Pelahatchie, Mississippi and with two more drawn places, and the item's Notes name why the binding was empty (the cast rule or the missing record, with its id).

**Files.** src/director/concession-received.test.ts, src/director/data/situation-types.json, src/director/civic-roles.ts

**Notes.** Oct 29, 05:45 UTC, words and director session: not a game bug. In Pelahatchie, Mississippi (run seed 1828b1406b544cb3:0), two residents filed, but only one reached the ballot; the count's record `election-result` for that race lists one candidate in its totals (person_40a21cfa110f9f0b, 23 votes), so there is no runner-up to call and the winner's entry binds only race-won. An unopposed winner getting no concession call is right. The test assumed two filers meant two on the ballot; it now passes over a race with fewer than two on the ballot, and passes on the next draw, Fort Ann, New York (3626704), from election-result:contest:seat:gus2025:204979:council:0:2025-11-04. Branch words/concession-call-binds.
