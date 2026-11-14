---
id: words-territory-address-names-no-body
title: 'A Puerto Rico address closes "thanks, Moca Municipio" and names no body; Guam gives no address'
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Second words reader via the Account lead, Nov 14 (Aceitunas, Puerto Rico, seed s8fresh1; Barrigada, Guam), recorded in words-lead/address-said-as/lines.md
lead: words
standard: 2
model: sonnet
effort: medium
root: design-words-machine
after:
---

**What.** Seen: the address a player gives to a town's body. In Puerto Rico the greeting at an address says the municipio only in the closing ("thanks, Moca Municipio") and names no governing body; in Guam there is no address at all (open and close undefined). Seen: the address a player gives to a town's body.

**Cause.** Needs cause. Not reproduced by S4; the lines are in `/mnt/project-files/words-lead/address-said-as/lines.md` (lines 77, 96). The municipio's body is "Municipal Legislature" in the office record (`municipioRules`), so the body exists; the address reader (`src/director/local-address.ts`, owned by the S8 thread) does not take it.

**Fix.** None until the cause is found.

**Time box.** 1 hour to find the cause, then Sonnet.

**Rules.** One rule for all 56 places; no hand-written player text in code.

**Done when.** In three drawn territory places (named with seeds) the address names the municipio's body; a second session, on main, gives an address in a Puerto Rico town and sees the body named.

**Waits on.** The S8 thread's address work.

**Files.** src/director/local-address.ts

**Notes.** Filed by builder S4, Nov 14; the item is not built while it says `Needs cause.`
