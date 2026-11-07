---
id: law-levels-specific-local-grants
title: "A specific state grant gives the town that power without general home rule"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: astra/specific-local-grants
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T21:24:43.077Z
---

**What.** The state can enact a specific local-power grant, but the drafting authority reader can still reject the town because its general home-rule answer is no. A specific grant should supply that power while the independent statutory gates remain enforced. Read the grant as current law and name its record when granting or barring the power; remove the authority reader's separate date-sort selection.

**Rules.** One rule, all 56 places: current state law comes through lawInForce and its one resolver. Preserve the existing special statutory gates and the State Sessions minimum-wage, paid-leave and sanctuary bars; do not change campaign, electorate or view engines.

**Done when.** A generated-world test in a drawn place prints replay and law record ids. With general home rule off, a specific rent-rule grant allows the city to draft; withdrawing it bars that draft; restoring it allows it again. Assert the actual grant/bar record as the authority source. Treat DC's single government as its recorded alias, not a fabricated separate town.

**Files.** src/core2/policy-authority.ts,src/core2/specific-local-grants.test.ts

**Notes.** Astra follow-up to the law-levels goal and the played Hamburg route. Two-hour time box, one session, no helpers. No new legal power is invented: this reads the specific state law already written by #7314.
