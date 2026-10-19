---
id: words-policy-spoken-names
title: "Each catalog policy has one spoken name, so a stand reads as a sentence, not a question"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/words-policy-spoken-names
pr: #4560
blocked-on:
source: "words-speech-built-in-stages, PR #4477"
claimed-at: 2026-10-16T02:53:35.364Z
---

**What.** Give each policy question in the bill catalog one spoken name that reads as a noun phrase or a verb phrase in a fixed form, so a stand in a speech or a conversation can be said as a plain sentence. Today the catalog's names are a mix ("rent stabilization", "end cash bail", "raise minimum wage"), so the staged speech says a stand as a question and an answer ("Restrict abortion? I'm against it.") to stay grammatical for both kinds. Add a spoken-name field to the catalog rows, or a data file keyed by question id, written in the English engine's authoring process, and have the speech stages say the stand as a sentence.

**Rules.** No hand-written player text: the names are authored data with author and date, not typed into code. One rule, all 56 places: the names are about policies, never a place. Estimate, never UNKNOWN: a question with no spoken name is not offered as a stand.

**Done when.** In a drawn place and a random seed, the staged speech built by the test in src/director/speech-builder.test.ts shows each stand as a full sentence with a verb, for every question the catalog names, and the bank test for the new names passes. The owner plays it: a stand in a speech sounds like a person talking.

**Files.** src/core2/data/legislature/bill-catalog.json (or a new data file beside it), src/director/question-names.ts, data/english/parts/speech-stages.json

**Notes.** Found while building words-speech-built-in-stages (PR #4477).
