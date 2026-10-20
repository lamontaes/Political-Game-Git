---
id: research-opening-stance-loadings
title: "Source how traits, faith and education move a person's opening stance on each policy question (survey-based loadings)"
area: people
kind: research
priority: 2
size: M
status: open
claimed-by:
pr: #5489
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** viewOn is still the person's lean times a question's axis plus what they have heard. To form an opening stance per question from traits, faith and education, the engine needs a loading for each trait, faith and education level on each policy question's axis, with a spread. Source them from a public survey (the Cooperative Election Study or the General Social Survey, which publish stance by religion, education and the personality measures the game's traits stand for) into data/research/people/ with a reader. Where a question has no survey item, the loading is zero and marked ESTIMATED.

**Rules.** Research before building: a sourced loading calibrates a band the proof reports against and never decides one person's stance. Estimate, never UNKNOWN: a question the survey lacks starts from the lean axis alone with a spread. One rule, all 56 places: any state survey spread is a per-state table in data.

**Done when.** A research file under data/research/people lists each loading by question with its survey, year and spread, a reader in src/core2/modules/views.ts or a script derives the parameter rows and says so in their citation, and tests/guards/research-data-has-reader.test.ts passes with the file named.

**Files.** data/research/people, src/core2/data/parameters.json

**Notes.** TODO

Looked at Oct 20 (claude), not claimed: a loading per trait, faith and education level on each policy question's axis is a regression on survey microdata (CES or GSS respondent files), not a published table; this container reaches neither Harvard Dataverse nor the GSS data portal as files, and typing loadings from memory would be inventing them. A researcher with the CES cumulative file can fit them (stance on each CES policy item on the Big Five items, church attendance and education) and write one row per question with the fit's standard error as the spread. The two items after this one (people-opening-stance-formation, elections-counted-voters-read-group-stances) follow from it.
