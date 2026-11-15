---
id: legislature-former-members-keep-sitting-ties
title: "Members who leave a body keep the ties their shared sittings built, fading after"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: legislature-members-have-no-tie-to-each-other
blocked-on:
lead: people
model: sonnet
effort: medium
root: none
source: Lying thread, Nov 15, from building the sitting reader
---

**What.** The tie from shared sittings is read over the members serving today, so when one leaves the body (an election lost, a resignation) the closeness their sittings built is gone the next day instead of fading. Seen: in dev mode, a council member who lost re-election still reads a tie to former colleagues that fades over the following months.

**Cause.** Found in code: `sittingHours` in src/core2/sitting-closeness.ts reads `bodiesOf` (serving terms only) and the body's seats today.

**Fix.** Read ended terms on the same office too, crediting the sittings in the pair's overlapping service and fading from its end, from the terms table the offices module already keeps; no copy of the sittings.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** No flat number; speed bar held.

**Done when.** At a named place and seed, a council member who leaves reads a fading tie to former colleagues a month after; a second session sees it in dev mode on main.

**Waits on.** The sitting-ties PR.

**Files.** src/core2/sitting-closeness.ts
