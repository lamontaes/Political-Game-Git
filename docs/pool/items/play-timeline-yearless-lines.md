---
id: play-timeline-yearless-lines
title: "The history timeline's lines leave out the year the timeline already shows"
area: play
lead: cto
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone: play-first
source: CTO and Words, Oct 30 (the timeline shows each year above a sentence that said it again)
---

**What.** A person's history on their card and in Your life is a timeline that prints each record's year above its sentence, and the sentence repeated the year ("Born in Lewes, Delaware in 1963."). Words added year-less pieces for the timeline (`person-history.timeline.*`, #6862). This item switches the card's one reader to them, deletes the dated pieces and the two closeness pieces nobody reads any longer, and keeps two records of the same event said once by its year and words, so three elections in three years stay three lines.

**Rules.** No hand-written player text: every line comes from the person-history bank. Replace, never layer: the dated pieces and the old school de-duplication by stripping " in YYYY" are deleted in the same change. One engine per mechanic: the card's `tellHistory` stays the only reader of the bank.

**Done when.** In a drawn place at 1440 by 900, named with its seed, a person's card and Your life show history sentences without a year in them under each year, the card-history tests and browser check pass, and the bank holds only the timeline pieces; a screenshot lands in `docs/play-first/shots/play-timeline-yearless/`.

**Time box.** 30 minutes, Opus (CTO).

**You will see.** "1963 · Born in Lewes, Delaware." instead of the year twice.

**Screenshot.** A card's timeline at 1440 by 900.

**Files.** src/bench/card.ts, data/english/parts/person-history.json

**Notes.** Filed by the CTO, Oct 30 03:50, on Words' word that the card is the pieces' only reader. Review: words.
