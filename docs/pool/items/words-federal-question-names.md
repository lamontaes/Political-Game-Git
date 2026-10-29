---
id: words-federal-question-names
title: "The 19 federal questions Congress may answer have spoken names, so the President can ask Congress about them"
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: words/federal-names
pr: #6311
blocked-on:
lead: words
source: director lead, director-president-asks-within-powers (#6300), Oct 27
claimed-at: 2026-10-27T12:32:57.571Z
---

**What.** Of the 27 questions `data/research/powers-catalog/question-powers.json` gives the federal level, only 3 have a spoken name in `data/english/question-names.json`. The opening address speaks a stand only for a named question (`NAMED_QUESTIONS`, `src/english/question-names.ts`), and since #6300 it asks Congress only on a question federal law can answer. So the 19 unnamed `us-federal-positions:*` questions (debt limit, top income tax rate, tariffs, immigration, Medicare drug prices, retirement age, student loans, passenger rail, power-plant carbon, farm subsidies, disaster cost sharing, mandatory minimums, congressional stock trading, national data privacy, D.C. statehood and others) can never be asked of Congress. Measured: 12 of 12 drawn places had no Congress ask after #6300.

**Rules.** No hand-written player text: each name is an `about` noun phrase and a `to` verb phrase in the bank file, authored to the English engine's patterns. American English. One rule, all 56 places: names carry no place.

**Done when.** `question-names.json` names every `us-federal-positions:*` question listed in `question-powers.json`; a new test beside `src/english/question-names.ts` fails on any federal-power question without a spoken name; and the bank tests and the American English sweep pass on the PR head.

**Files.** data/english/question-names.json, src/english/question-names.ts

**Notes.** The Congress section also needs the President's stance on federal questions (`gov-federal-questions-answers-stances`); the two together bring it back with no director code.
