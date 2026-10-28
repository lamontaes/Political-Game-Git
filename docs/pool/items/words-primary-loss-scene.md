---
id: words-primary-loss-scene
title: "A candidate put out in a top-two or top-four primary gets no scene: the household's loss fires only from the general's count"
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: finisher/words-primary-loss-scene
pr: #6388
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A top-two or top-four primary (src/core2/modules/voting.ts holdPrimary) sends only its top finishers on, marks the others' filings withdrawn and writes a public primary-result record naming every candidate. The director has no rule for primary-result, so a candidate it put out never has a loss scene at home or on their own: the family-loss and race-lost scenes fire only from the general's election-result, which no longer names them. Seen in Deer Park, Washington (seed 393dad669a24a488:1, purpose-scenes), where two of three filers for county assessor were out in the August primary and nothing was staged for either.

**Rules.** Wire to the world: the primary's own record fires the loss for each candidate it put out, read by the director as the general's count is. Replace, never layer: the same family-loss and race-lost scenes take the primary as a cause; no second loss scene. No hand-written player text: the lines come from the scene-talk bank.

**Done when.** In a played world built with buildBenchWorld in a place drawn from all 56 that holds a top-two or top-four primary (seed named), every filer the primary-result record puts out has a family-loss or race-lost scene from that record on the night it plays, composed in the lines that play, named by record id; shown by src/director/purpose-scenes.test.ts or its own test.

**Files.** src/core2/modules/voting.ts, src/director/data/director.json, src/director/data/situation-types.json, src/director/purpose-scenes.test.ts

**Notes.** TODO
