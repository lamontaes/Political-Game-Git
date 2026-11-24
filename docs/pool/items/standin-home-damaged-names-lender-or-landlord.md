---
id: standin-home-damaged-names-lender-or-landlord
title: "A damaged home's record names its lender or landlord so the repair talk can cast them, and a player who lives alone is still told"
area: words
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** After a disaster the player's household talks over the damaged home, but only people who live with the player are in the scene. The record names no lender, landlord or aid worker, so a player who lives alone is told nothing, and a home the counted population lost has no scene. Closes stand-in SG-STORY-home-damaged-cast. Seen: in the repair talk that names the lender or landlord.

**Cause.** Found in code: src/core2/modules/disasters.ts emits `disaster.home-damaged` (about line 750) with the home's kind, aid and repairs but no payee; the damaged row (`damaged` table, line 419) is keyed by household only. The home's lender is in src/core2/modules/credit.ts (the `mortgages` table, `lenderId`) and its landlord in src/core2/modules/housing.ts (the lease's `payeeId`). src/director/purpose-scene.ts (marker near line 656) and the `home-damaged` type in src/director/data/situation-types.json cast only the household.

**Fix.** In the disasters engine, when it fills the damaged row, read the household's mortgage lender (credit engine) or lease payee (housing engine) and put its organization id on the row and on the `disaster.home-damaged` facts (`payeeId`, `payeeKind`). Add to the `home-damaged` type a third role (the lender's or landlord's contact, filled from that id the way other organization roles are filled) and let the director cast it. Where the player lives alone, the household's talk is replaced by a letter or call from that party; do not add a second scene type. Leave counted households out (they have no named head); say so in the marker. Reuse the existing role-fill code; add no new writer.

**Time box.** 6 hours.

**Rules.** An effect is a read, not a record: the director reads the payee id the disasters engine wrote, and the line cites it. No hand-written player text: the lines come from the English engine's banks. One rule, all 56 places. Speed: the payee is read once when the row is filled, in the same loop that fills it.

**Done when.** A second session runs a disaster year in a generated world in a drawn place (place and seed named) and sees, for a household that has a mortgage or rents, the repair scene include the lender or landlord by name, citing the damaged-home record; and for a player who lives alone, a letter or call about the damage instead of nothing.

**Waits on.** Nothing.

**Files.** src/core2/modules/disasters.ts, src/core2/modules/credit.ts, src/core2/modules/housing.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/stopgaps.json

**Notes.** Stand-in triage Nov 10 (chunk 2). Insurance paid over months is its own item, world-disasters-from-conditions-part-2-repairs-and-insurance-over-months; this one only names the party.
