---
id: candidacy-platform-shades-toward-district-by-traits
title: "An ambitious or cautious candidate shades a few of their platform's stances toward what their own district favors"
area: elections
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: campaign-money-refit-after-views-carry-popularity
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: Account lead, Nov 14 (note on the views thread's ruling that a platform leaves national popularity out)
---

**What.** A candidate's platform now reads only their own lean, faith and degree, life and what they have heard; it ignores what is popular, which is the simple end. In life an ambitious or cautious candidate moves toward what their own district wants on a few questions, and a principled one does not. Seen: the Campaign tab's platform, debate and interview answers, and the paper's read of where a candidate stands.

**Cause.** Found in code: `StanceReader` in `src/core2/campaign-stances.ts` reads `ownOpeningStance` (`src/core2/modules/views.ts`) with no term for the district; the views thread found on Nov 14 that adding national popularity to every candidate moved every rival in a race to the popular side together (Marshfield MA, 75d9b7ad: no pair of rivals opposed on more than 5 of 29 questions), so national polls are the wrong source.

**Fix.** A candidate reads where their own district's voters stand on each platform question (`electorateSides` in `src/core2/modules/voting.ts` for the district they run in) and moves part of the way toward it, by their traits (ambition and caution move them, principle and conviction hold them; the trait data's leans), on the questions where the district is most one-sided, a few at most. The move is recorded with its reason so the paper and a rival can call it out.

**Time box.** 4 hours, Opus at medium effort.

**Rules.** No dice: the candidate's traits and the district's voters decide. One rule, all 56 places: the district comes from data, never a named place.

**Done when.** At three pinned places, in a race with two or more candidates, an ambitious candidate's platform moves toward their district on at least one question and a principled one's does not, and the pinned rivals test (`src/core2/candidate-platform-spread.test.ts`) still passes; a second session, on main in a drawn place it names with its seed, sees in dev mode a candidate's stance moved toward the district with the reason named.

**Waits on.** `campaign-money-refit-after-views-carry-popularity` on the train.

**Files.** src/core2/campaign-stances.ts, src/core2/modules/views.ts

**Notes.** Nov 14 (claude, views thread): filed at the Account lead's note.
