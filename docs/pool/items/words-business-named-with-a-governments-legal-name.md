---
id: words-business-named-with-a-governments-legal-name
title: "A business is named from the county's plain name, never a consolidated government's legal name"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15 (coordinator relay 08:21Z)
---

**What.** A resident says "Metro Government of Louisville-Jefferson County Telephone Cooperative let me go." A business is named with a government's legal name plus a business ending, so the line reads as no one would say it. The place's own plain name is what people use on a business's door. Seen: Meadowview Estates, Kentucky (2151294), run f04c6a19e72b8d53, 2026-01-21 (Account lead, Nov 15; the run was not re-run here).

**Cause.** Found in code: src/core2/business-names.ts `businessNameContext` fills `{county}` with `countyDisplayName(unit.name, unit.id)` from the county's government unit (`countyGovernmentUnitsForPlace`), and for a consolidated city-county the unit's name is the government's legal name ("Metro Government of Louisville-Jefferson County") while the county's own place record says "Jefferson County"; the styles in src/core2/data/business/names.json put `{county}` in front of a business ending. This is a different cause from the call letters (a name's capitals said at the sentence): the name is wrong where it is built.

**Fix.** Build `{county}` from the county's place record name (`county:<geoid>`, "Jefferson County"), the plain name people use, where the unit's listed name is a government's legal name; keep `countyDisplayName` for a government said as a government. One function says it; the business-name styles read it.

**Time box.** 3 hours.

**Rules.** One rule, all 56 places: the county's plain name comes from its place record in data, never a named place in logic; no hand-written player text.

**Done when.** At Meadowview Estates, Kentucky (2151294), run f04c6a19e72b8d53, a second session reads the telephone cooperative's name as "Jefferson County Telephone Cooperative" in a resident's line and in the business record, and a test pins that place and seed.

**Waits on.** Nothing.

**Files.** src/core2/business-names.ts,src/core2/government-proper-name.ts,src/core2/data/business/names.json
