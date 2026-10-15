---
id: people-favors-and-leaks-stopgap-sg-people-press
title: "Favors and leaks (stopgap SG-PEOPLE-press-favors-and-leaks)."
area: people
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OPUS-PEOPLE.md line 20 (unchecked checklist line)"
---

**What.** A reporter's closeness to a candidate gives access and gentler copy, but a candidate cannot do a reporter a favor or leak a story, and a reporter cannot hold a story for a friend (SG-PEOPLE-press-favors-and-leaks, `press.ts` line 1321). Add a leak as a conversation move that puts a record on the reporter's wire with the leaker named in the reporter's knowledge, and favors as relationship acts the reporter weighs when deciding what to print. The player would notice that leaking a story gets it printed, that the reporter remembers who leaked, and that favors change coverage.

**Rules.** No dice: whether a reporter prints, holds or slants follows their traits, closeness, ethics and the outlet's rules, never a roll; An effect is a read, not a record: the press reads the leak record and favor history when it decides what to print; Ask why: a printed or held story keeps its reasons, including who leaked, by record id; The chain is the acceptance: follow one leak to the reporter's wire, the story, the readers' changed views and the leaker's relationship; This is a game, not a spreadsheet: a leak is one conversation move, not a form; No hand-written player text: the move and the story are worded by the English engine; Placeholders: the SG-PEOPLE-press-favors-and-leaks row closes only when leaks run; Look before you ask: read DECISION-REGISTER.md on press endorsements before touching coverage.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the bench player leaks a story to a named reporter in a conversation, the outlet prints (or holds) it with the reason, and a named reader's view moves (leak, story and reader ids). Tests in `src/core2/press.test.ts` and `src/director/conversation.test.ts`. The row closes. The owner plays it: tells a reporter a secret and reads it in the paper.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, src/director/conversation.ts, data/english/parts/conversation.json, src/core2/data/stopgaps.json

**Notes.** Checklist line from OPUS-PEOPLE.md; verify against main before starting.
