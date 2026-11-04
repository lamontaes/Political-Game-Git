---
id: release-zero-dice-sibling-name-entry
title: "The no-dice guard is red on main: the sibling-name pick from #7157 has no inventory entry"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: lane-5/zero-dice-sibling-names
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** npm run zero-dice on main 44f14801eb reports one new list-pick, src/core2/sibling-names.ts:36, the seeded pick of a sibling's unused given name merged in #7157. It names who someone is, so it is IDENTITY, but the allowlist has no entry, so the guard fails for every branch. Found by Lane 2 on #7173.

**Rules.** No dice: a pick may stand only when it names or draws who someone is, and its entry says why (docs/design/list-pick-inventory.md). The guard is never loosened; one entry with its reason.

**Done when.** The no-dice guard test, npm run zero-dice, prints nothing new on main after the merge, and scripts/zero-dice-allowlist.json carries exactly one IDENTITY entry for src/core2/sibling-names.ts with the reason it names who someone is.

**Files.** scripts/zero-dice-allowlist.json

**Notes.** TODO
