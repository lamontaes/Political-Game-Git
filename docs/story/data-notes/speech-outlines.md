# Notes that were in src/director/data/speech-outlines.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

One outline row per kind of speech, read by the one planner every speech goes through (src/director/speech-outline.ts; words composer, unit 3, docs/design/words-composer.md). A row says the sections in order, which are required, how many points and asks the theme carries, whether the asks are numbered, and whether the speech may tell the past year as the speaker's own record. Sections: `salutation` (the people acknowledged, one sentence of its own), `occasion` (why we are here; `oath` in an inaugural), `creed` (what the speaker believes, and unity with those who voted otherwise), `history` (the day in the long story), `theme` (the theme's point, one paragraph in order: its context from the world's records, what that has meant for people, the year's claim where the speaker governed it, the speaker's stand, then the ask, plainly for or against, to the level that can act; a theme makes `points` of them at most and `leastPoints` at least, or the speech is not given), `people` (the people met), `states` (the turn to the states, with no federal ask), `call` (what the speaker asks of the people), `hope`, `families`, `close`. A section in `asides` is said only when the speaker's traits pull for it (opening-address.json `asides`). The rows hold no sentence: the words are the opening-speech bank's. ESTIMATED from the pages read in docs/research/speech-structure-2026-11-12.md: real inaugurals give no numbered ask list and no last-year record (Bush 2001, Biden 2021); a State of the Union moves each point context, stand, ask and numbers its asks (Biden 2022); a State of the State and a State of the City do the same at their level (Polis 2024, Ginther 2024); speech courses keep one theme with about three points.

## `theme.about`

How the one theme is picked from the speaker's own record and their world (owner, Nov 12: 'There's no theme for the speech. That's a problem.'). Every subject of the bill catalog scores: each of the speaker's signature issues in it, at any level (`signature`); whether their level has an open question in it to ask for (`actable`); how far their view on its strongest open question stands from a centrist's (`stance`); and, for a governor or mayor only, how far the subject's measures moved the wrong way in their realm (`condition`). The President's theme takes no condition: the national figures are nearly the same in every world, so they cannot decide it. The highest score is the theme; a tie goes by the subject's id. No roll.

## `topicsBySubject.about`

Which of the world's measures bear on each subject of the bill catalog: the macro engine's year (unemployment, inflation, wages, mortgage, growth, jobs) and the term read's areas (rent, crime, schools, health, roads, environment). A theme's points are its subject's measures.

## `subjectOfQuestion.about`

Questions the bill catalog gives no subject, placed under the subject a speech treats them as part of.

## `subjectPull.about`

Which subject under a theme a speaker leads with when none of their own causes is in it: the subject whose facets their recorded traits sum highest on (the traits are the speaker's record; no roll). The facets are the personality catalog's. TUNABLE: checked so that no question leads more than half of ten drawn addresses.

## `pointShapes.about`

The shapes a speech's point may take (owner, Nov 8: "almost all of them feel the exact same"; Nov 14: "they all follow the very same format", so a shape that only reorders another's moves, as figure-first did context-first's, was deleted on Nov 17; the words lead, Nov 12: "A point has several shapes"). Each lists its moves in order; `figure` stands for the figure's sentences (context, what it has meant, the speaker's own record, and the sentence that ties it to the question), said only where the question's row lets the speaker's side use a measure. A condition comes before its answer (the words lead, Nov 14, rule 44): no shape puts how it stands, the figure or the question after the ask. A speech's points take the shapes in the order the speaker's traits pull hardest (`pull`, the summed facets), one shape per point, so no two points of a speech share one; ties go by the shape's name. No roll. The figure's tie names no question, so the ask after it names the question once. The question-first shape asks the audience about how things stand ("Is it fair that ...?"), so it names no question and says no separate today sentence. Where a belief goes is `beliefJoins`, one join to a point, in order.

## `themeNames.about`

A speech's theme said as people say it, by the question family (the principle both sides argue from). TUNABLE wording, checked by reading the composed addresses.

## `themeShort.about`

A theme said short, for a frame that names it after the speech has said it in full (a close): at most themeShortWords words (src/director/speech-closes-fit.test.ts). TUNABLE wording, checked by reading the closes.

## `themeShortNoOn.about`

Themes whose short name does not read after "On" (the words lead, Nov 14, round 4): a close for one of them says no theme tag. A tag ("On X, ...") is said at most once in an address, so a close that follows a meaning line says none either.

## `measureWords.about`

What a body passes, by the form its measures take (src/core2/legislature-bill-form.ts formKindOf): a legislature or Congress passes bills for acts, a town, township or county body ordinances (line rule body-named-as-place-names-it).

## `conditions.about`

This year's conditions a governor or a local head tells in the opening (speech-outline.ts conditionFacts): the budget's balance is said as ahead or short only past this share of what the budget spends, and as better or worse than the year before only past the same share; inside it, about even or about the same. The balance is said only when it is short, when the speech's theme is one of `budgetThemes`, or when a point asks for a line of the budget.

## `topicWords.about`

Each measure said short, where a figure's meaning names it ("On crime, that has meant ..."): the slot context-name, read in speech-outline.ts contextFacts (words lead, Nov 14, rules 39 and 41: the years are said once, so the meaning names its measure instead).

## `beliefJoins.about`

How a point's belief joins its ask, one join to a point in the order of the speech's points, so no two points share one and "Because I ..." opens at most one sentence (the words lead, Nov 14, rule 38): `belief-leads` says the belief first ("Because I believe X, I will Y"); `belief-after` says the ask and then the belief as its own sentence; `belief-folded` folds it into the ask ("I am against X because Y, and ..."). A point after the last join says no belief.
