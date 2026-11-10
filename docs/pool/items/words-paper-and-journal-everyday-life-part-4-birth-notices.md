---
id: words-paper-and-journal-everyday-life-part-4-birth-notices
title: "A birth notice prints from the person-birth record"
area: words
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
source: split from words-paper-and-journal-everyday-life in the pool redo, Nov 10, 2026
standard: 2
---

**What.** A birth is a recorded event, but the paper has no birth notice. Add a press kind that prints a birth notice from the person-birth record, worded from the banks, so the paper carries births the way it carries obituaries.

**Cause.** Found in code: src/core2/modules/press.ts (the press kinds around `LETTER_DECISION`, line 3055) and src/core2/press-topics.ts list no birth kind (Lane 3, Nov 4: no birth notice printed in any of three seeded places).

**Fix.** Add the press kind and its topic entry reading the person-birth event, word it in data/english/parts/news.json and headlines.json (Story writes the pieces), and keep a birth with no public record off the wire.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: words come from the banks. Wire to the world: the story prints from a record an engine writes, cited by record id. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, not the builder, plays a year in a drawn place it names and reads a birth notice in the paper with the person-birth record id shown; a test in src/bench/printed-words.test.ts fails when a printable birth is on the wire and nothing prints.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/press-topics.ts, data/english/parts/news.json, data/english/parts/headlines.json, src/bench/printed-words.test.ts
