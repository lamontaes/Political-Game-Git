---
id: gov-municipal-body-name-from-charter
title: "A city's council is named as its charter names it, from the compiled municipal readings"
area: gov
kind: stopgap
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-gov-municipal-body-name
pr: #5175
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:51:08.118Z
---

**What.** A city council's office record named its collective body after the town and the word "Council", because the compiled municipal readings kept each charter's member classes and sizes but dropped its body name. The old engine's corpus has it ("Anchorage Assembly", "Birmingham City Council") for 90 of the 144 compiled governments. Carry the name into the compiled reading, read it where the council's office is built, and keep the generic name only for a town with no compiled charter.

**Rules.** Replace, never layer: the generic name is used only where no charter was read, and the stopgap row is narrowed to that case. One rule, all 56 places: the name comes from the compiled data, and no place is named in logic. Estimate, never UNKNOWN: a town with an unread charter keeps a labeled generic name.

**Done when.** For every compiled government whose reading names its body, the council office built for its place (localOfficesForPlace) carries that name, shown by government key in src/core2/offices-local-names.test.ts over at least 20 places; the government rule parity tests and the stopgap tripwire pass.

**Files.** src/core2/gov-rules/municipal-governments.json, src/core2/gov-rules/municipal-government.ts, src/core2/gov-rules/local-governing-body-rules.ts, src/core2/offices-local.ts, src/core2/data/stopgaps.json

**Notes.** Found scanning the open missing-record stopgaps on Oct 19. The JSON is rewritten by GOV_RULES_WRITE=1 npx vitest run src/core2/gov-rules.test.ts, which adds bodyName to each reading (90 of 144 have one). The name is a separate accessor, localGoverningBodyName, so the parity test against the old engine's rule object still matches.
