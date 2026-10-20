---
id: words-speech-stage-parts
title: "Speech stages: the engine writes the opener, core parts and closer for a built speech"
area: words
kind: feature
priority: 1
size: M
status: blocked
claimed-by:
pr:
blocked-on: PR #5647 (words-authored-parts-shippable-sweep) is not merged: until it holds the authored parts, main still ships them and the slot is not empty; the replacement lines then need the civic-prose editorial review or a rebuilt mining corpus (46,191 documents, outside the repo)
source: added with npm run pool -- add
---

**What.** The held hand-written sentences in data/english/parts/speech-stages.json left the opener, the two core parts (stance, work, home, children, school) and the closer of a built speech with no shippable part, so the game shows nothing there until the English engine writes it. Compose or mine the line for the opener, the two core parts (stance, work, home, children, school) and the closer of a built speech from the speaker's stances from the views engine, job, town, household and school facts, as engine-written bank parts with their source, and have the director use it. The player would read the line again, written by the engine from the record.

**Rules.** No hand-written player text: the line is composed or mined by the English engine, never typed (owner, Oct 6, EN-1 to EN-3). No dice: which part is said follows the record and the speaker's traits. American English. One rule, all 56 places: the part names no place.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, named in the PR body, the slot the opener, the two core parts (stance, work, home, children, school) and the closer of a built speech is worded from engine or mined parts in data/english/parts/speech-stages.json and cites the speaker's stances from the views engine, job, town, household and school facts by record id; the rewritten director test that now asserts the slot is empty asserts the real line instead, and tests/english-parts-banks.test.ts passes.

**Files.** data/english/parts/speech-stages.json, src/director/speech-builder.ts, src/director/speech-builder.test.ts

**Notes.** Filed by fs11vb while rewriting the 17 director tests for PR #5647, as the CTO required for every slot left without engine parts.
