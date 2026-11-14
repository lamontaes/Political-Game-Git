---
id: lives-known-single-age-fit-has-no-floor
title: "A single in town is paired with whoever they know best at any age gap, because the known partner is never weighed against the wider population"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
source: "family life report 1 (Words lead brief S), Nov 14 2026: /mnt/project-files/words-lead/family-life/report-1.md"
model: sonnet
effort: medium
root: none
---

**What.** The partnerships engine's monthly review pairs a single in the played town with the known single who scores best on age fit times closeness, however poor that fit is. In Pulaski, Ohio (seed family-a, drawn with `drawPlace("family-a", "family-life")`), it paired the player at 19 with a woman of 30 on 2026-12-01 (record `family.partnered:partnership:person_a56f9dde264b4114:person_afd63a42680c35a0:2026-12-01`). Seen: who the player is told they started dating, in the date scene and on their card.

**Cause.** Found in code: `knownSingle` in src/core2/modules/partnerships.ts (about line 553) returns the highest `partnerAgeLikelihood × closeness` among the person's known singles, with no comparison to anything. `partnerAgeLikelihood(19, male, 30, female)` is 120.8 against 7,546.7 at 19 (the CPS spouse gap table in src/core2/opening-partnership.ts), so a 30-year-old acquaintance wins whenever no one closer in age is known. The other path, `meetPartner` (a partner from the wider population), is only tried when no known single exists at all.

**Fix.** Weigh the best known single against the wider population the way the engine already weighs pulls against their typical: take the known single only when their score is at least what the person's own age gives in the wider population (the fit at the modal gap from the same CPS table, times the typical closeness of a new couple), else meet a partner from the wider population. No new parameter unless one is needed for the typical closeness, and then TUNABLE under the existing SG-LIVES-partner-stage-lengths family. One rule for every single in town, not the player alone.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the pairing follows the people's ages and ties, never a roll. Real rates check totals: the age gaps of couples formed in play are compared with the CPS spouse gap table, never forced to it. Speed: the monthly review stays within 20% of its base.

**Done when.** A second session runs three drawn places for three years with a script like scripts/dialogue-batch/couple-scenes.ts and lists the age gaps of couples formed in town, before and after, with the CPS table beside them; and the Pulaski pairing above is either gone or explained by the people's own ties.

**Waits on.** Nothing.

**Files.** src/core2/modules/partnerships.ts, src/core2/opening-partnership.ts (read only)

**Notes.** Filed by the family life builder (thread "Write family life scenes"), Nov 14 2026.
