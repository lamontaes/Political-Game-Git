---
id: words-concession-call-unbound-pelahatchie
title: "The runner-up's concession call does not bind in Pelahatchie, Mississippi, so the winner hears no call"
area: words
kind: bug
priority: 2
size: S
lead: words
status: in-pr
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

**Notes.** TODO
