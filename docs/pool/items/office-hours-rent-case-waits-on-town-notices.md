---
id: office-hours-rent-case-waits-on-town-notices
title: "A resident behind on rent never brings the notice to office hours"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
root: none
claimed-by:
pr:
after: world-rent-notices-miss-town-renters
blocked-on: world-rent-notices-miss-town-renters
lead: words
source: 'Civic roles builder, Nov 16: the rent branch of words-office-hours-says-the-act came out unplayed (the Account lead: "Play it by presses or take the rent branch out of this PR with an item saying what blocks it")'
model: opus
effort: medium
---

**What.** A resident who has been served a rent notice never brings it to an official's office hours, so the eviction variant of the visit never plays. The Words lead's 14 eviction lines for it wait in /mnt/project-files/words-lead/office-hours/eviction-lines-held.json. In 12 played towns, Seneca Falls, New York (3666322) over 300 days among them, no rent visit came even when filed cases still open to a cure were counted. Seen: no office-hours visit about rent in any played town.

**Cause.** Found in code: `problemOf` in src/core2/modules/constituent-cases.ts opens no case for a rent notice, and a branch that did could not play. The monthly housing step in src/core2/modules/housing.ts serves nearly every notice to full households outside the played town (item world-rent-notices-miss-town-renters). `bringCases` reads rent only for full residents, so a counted resident with a notice never brings a case.

**Fix.** After world-rent-notices-miss-town-renters lands, add a `behind-on-rent` problem to `problemOf`, read from an open housing case whose cure is still open (notice or filed stage, before the hearing). In `resolve`, the help ending puts the household first in the town's rent help (`payRentAssistance` in src/core2/housing-assistance.ts reads the referral) where the town pays it. Turn the eviction variant in src/director/data/arc-variants.json into the arc whose help ending is `rent-help-first`. Put the held lines back once the Words lead reads them.

**Time box.** 3 hours, Opus.

**Rules.** One model, two tiers: a counted renter with a notice brings a case by the same rule as a full one. No dice: the case's outcome is the scene's ending read by the cases engine.

**Done when.** A played file at the PR's sha shows a rent visit in a played town, by the player's presses. It is followed to its record: the household put first and the rent paid, or told the town has none. A second session sees a rent visit in a drawn place it names with its seed.

**Waits on.** world-rent-notices-miss-town-renters.

**Files.** src/core2/modules/constituent-cases.ts, src/director/constituent-help-facts.ts, src/director/data/arc-variants.json, src/core2/data/constituent-cases/scene-endings.json, data/english/parts/scene-talk.json, src/core2/housing-assistance.ts

**Notes.** Filed by hand by the civic roles builder, Nov 16. Dev-mode gap: dev mode cannot show why a resident did or did not come to office hours (the case the cases engine weighed and the notice on the household); named in world-rent-notices-miss-town-renters too.
