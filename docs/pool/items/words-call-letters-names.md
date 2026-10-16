---
id: words-call-letters-names
title: "A station's call letters keep their capitals: KTKY-TV, not Ktky-Tv"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/words-call-letters-names
pr: #4538
blocked-on:
source: "gov-stopgap-press-desk-missing-record, PR #4536"
claimed-at: 2026-10-16T00:06:34.517Z
---

**What.** The name helper properName in src/director/words.ts title-cases any name written wholly in capitals, because some federal files hold names that way ("CENTRAL HIGH"). A television station's call letters are also wholly capitals, so a neighbor says "I saw Ktky-Tv ran a story" for KTKY-TV. Teach the helper to keep a name in capitals when it is a broadcast call sign (four letters starting with K or W, optionally followed by a band suffix such as -TV or -FM) and to keep the existing rule for everything else.

**Rules.** No hand-written player text: the rule changes how a record name is written, and no sentence is typed. One rule, all 56 places: the call-sign shape is the federal one (47 CFR 73.3550), never a named station. Replace, never layer: the helper is fixed in place, with no second helper beside it.

**Done when.** In a played world in a drawn place (buildBenchWorld) with a television or radio outlet, a neighbor's bring-it-up line writes the station's call letters in capitals, shown by record id, and a test in src/director names the shape and a name that must still be title-cased. The owner plays it: he hears a neighbor name the station correctly.

**Files.** src/director/words.ts, src/director/bring-it-up-press.test.ts

**Notes.** Found while building the printed-story bring-it-up row.
