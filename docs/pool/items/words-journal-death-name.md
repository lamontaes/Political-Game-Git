---
id: words-journal-death-name
title: "A death in the family names the person once: the age and the illness are one sentence"
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr: pending
blocked-on:
lead: words
source: coordinator, Nov 10 ("My father died. That was difficult. John was 56 years old. John had been seriously ill.")
claimed-at: 2026-11-10T14:00:00.000Z
---

**What.** The death story said the relative's name in two sentences. People carry a gender for choosing "his", "her" or "their" (`looks.gender`), but the journal has no subject-pronoun table ("he", "she", "they"), and no pronoun is guessed from a name. So the age and the illness are one sentence naming the person once: "John was 56 years old and had been seriously ill." A row's `follow` entry may now name alternatives ("a|b|c"): the first that the facts let be worded is told, here the sentence that names both facts, else the age alone, else the illness alone.

**Done when.** src/director/journal-death-school.test.ts prints the death entry with the name once; journal.test.ts, journal-story.test.ts, the English and families guards pass.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, data/english/parts/journal.json

**Notes.** Paused Nov 10 (weekly limit). Branch story/journal-death-name holds the work. Done: the one-sentence death memoir and the "a|b|c" alternatives in a row's follow; death-school test passes on seeds 5 and 41, journal.test (18) and journal-story (4) pass on seed 11. Left: director.test.ts, families, the English guards and english-parts-banks on seed 11 were still running and have not been seen to pass; then open the PR.
