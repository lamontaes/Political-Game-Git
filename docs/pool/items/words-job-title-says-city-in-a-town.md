---
id: words-job-title-says-city-in-a-town
title: 'A job title says "city" in a place that is a town: "city clerk at the Town of Ranchester"'
area: words
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr:
blocked-on:
source: Words builder B and the Words lead, Nov 14, cards in Ranchester and Raymond ("city clerk at the Town of Ranchester"; "city attorney at the City of Raymond" says city twice)
lead: words
standard: 2
model: sonnet
effort: medium
root: design-words-machine
after:
---

**What.** A person's card says "Works as a city clerk at the Town of Ranchester." and "city attorney at the City of Raymond" (city twice). Seen: the person card's work line, the Journal and news lines that say the title.

**Cause.** Found in code: the roles are stored with "city" in the title, `role("City clerk", ...)` in the `city-hall` workplace of `src/core2/town-workplaces.ts` (line 413) and `CIVIC_MINIMUM` in `src/core2/opening-town-jobs.ts` (line 109), and the card reads `job.title` as stored (`personCard` in `src/bench/card.ts`). The clerk's counter already follows the place's own kind (`src/director/filing-visit.ts`, rule 8); the card does not.

**Fix.** One helper says a job title by the place's own kind, as the counter does: "town clerk" in a town, "city clerk" in a city, "village clerk" in a village; where the employer's name already carries the kind, the title drops the word ("attorney at the City of Raymond"). The card, the Journal and the news use it; no per-place list.

**Time box.** 2 hours, Sonnet.

**Rules.** No hand-written player text in code; one rule for all 56 places; replace, never layer.

**Done when.** In three drawn places of different kinds (named with seeds), the card, a Journal line and a news story name the title with the place's own kind and none says "city" beside "Town of"; a test fails on a title whose kind word differs from its place's kind. A second session, on main, opens a clerk's card in a town and sees "town clerk".

**Waits on.** Nothing.

**Files.** src/core2/town-workplaces.ts, src/core2/opening-town-jobs.ts, src/bench/card.ts, src/english/journal-words.ts

**Notes.** Filed by Words builder B, Nov 14. Built by S4: `jobTitleByKind` in `src/core2/person-work.ts` takes the kind from the employer's name ("town clerk" at "Town of Ranchester", "township clerk" at "Charter Township of Green", "attorney" at "City of Raymond", never "city" twice); the card, the Journal, talk and the party facts read it. The payroll jobs ("City Attorney" at the treasury) are titled by their source data, so the fix reads at the point of saying, not at the title's source.
