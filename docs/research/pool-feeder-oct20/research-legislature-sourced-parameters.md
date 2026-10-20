# research-legislature-sourced-parameters

Oct 20 pool-feeder research for three legislature rows. All three were already worked on Oct 19 (low confidence: no primary page was fetched for the per-place tables), so this file reuses those results by file and key and adds nothing invented. All three are ESTIMATED.

## SG-GOV-local-executive-proposal

- Feeds: src/core2/data/legislature/executive-proposal.json; proposalRight
- Recommended: Per-place mode table in the Oct 19 file (key `recommended`, 56 place codes): by-request 35 places, manager-agenda 16, none 4 (GU VI AS MP), transmit 1 (DC). Manager-agenda: AZ CA CO FL KS MI MO NV NM NC OK OR SC TX UT VA. Every other state plus PR is by-request.
- Low / high: council-manager share 25% (mayor-council states) / council-manager share 65-80% (manager-agenda states)
- Unit: mode per place; estimated share of cities by form
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/C-government-law.json key SG-GOV-local-executive-proposal (confidence low, retrieved false per place) — Wikipedia, Council-manager government, 2026 — https://en.wikipedia.org/wiki/Council%E2%80%93manager_government — (page fetched Oct 19; per-state shares are the researcher's estimates)
- Note: No per-city charter source exists in the file; modes are state-level estimates from the dominant city form.
- builderNote: Add the per-place mode to executive-proposal.json and have proposalRight read it; keep a registered stopgap for per-city charters.

## SG-GOV-local-bill-numbering

- Feeds: src/core2/modules/legislature.ts; src/core2/data/legislature/enacting-clauses.json
- Recommended: Per-place municipalClause, countyClause, municipalNumbering and countyNumbering in the Oct 19 file (key `recommended`); examples: NY "Local Law No. N of YEAR"; MD counties "Bill N-YY"; CO "Ordinance No. 12, Series of 2026"; counties that pass resolutions or orders instead of ordinances in AL, CO and others; CT has no county government.
- Low / high: n/a / n/a
- Unit: text pattern per place
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/C-government-law.json key SG-GOV-local-bill-numbering (confidence low; statute cites recorded "from memory", retrieved false) — game repo enacting-clauses.json — "The enacting clause each state's or territory's bills must carry" (only the repo file was fetched)
- Note: ESTIMATED: statute cites (for example A.R.S. 9-240) are from memory and were not fetched. Patterns are format templates for generated text, never shown as sourced.
- builderNote: Add the four per-place fields to the municipal rule pack and read them when a body numbers and opens an ordinance; fall back to the national pattern only where the table says so.

## SG-GOV-committee-structure

- Feeds: src/core2/modules/legislature.ts; src/core2/data/legislature/committees.json
- Recommended: 108 chambers in the Oct 19 file: standing committees per chamber median about 16.5 (range 4 to 45); typical members per committee median 7.5 (range 5 to 30). Appointer: Speaker 41 chambers, Senate President 12, President Pro Tempore 6, Committee on Committees 6, others by place. Joint committees in CT, ME and MA.
- Low / high: 5 members / 30 members
- Unit: members per committee; committees per chamber
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/C-government-law.json key SG-GOV-committee-structure (confidence low, retrieved false) — game repo committees.json — appointer text per chamber and standing-committee counts (repo file read; chamber websites not fetched)
- Note: Mechanic and numbers: leadership appointing members is the builder's mechanic; the committee counts and sizes are estimates.
- builderNote: Replace seniority-ratio seating with appointment by the chamber's named appointer; size committees from typicalMembers; seat both chambers on joint committees.
