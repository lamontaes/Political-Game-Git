---
id: people-favors-and-leaks-stopgap-sg-people-press
title: "Favors and leaks (stopgap SG-PEOPLE-press-favors-and-leaks)."
area: people
kind: feature
priority: 2
status: in-pr
claimed-by: claude/press-leak
pr: #5163
blocked-on:
milestone:
source: "docs/coordination/OPUS-PEOPLE.md line 20 (unchecked checklist line)"
claimed-at: 2026-10-19T21:37:31.768Z
---

**What.** Checked against main on Oct 16: OPEN. `press.ts` still registers `SG-PEOPLE-press-favors-and-leaks`, and "leak" appears in no conversation part. Next: A leak as a conversation move that puts a record on a reporter's wire. The player would see it as a choice among people, never a form.

**Rules.** No dice: whether a reporter prints, holds or slants follows their traits, closeness, ethics and the outlet's rules, never a roll; An effect is a read, not a record: the press reads the leak record and favor history when it decides what to print; Ask why: a printed or held story keeps its reasons, including who leaked, by record id; The chain is the acceptance: follow one leak to the reporter's wire, the story, the readers' changed views and the leaker's relationship; This is a game, not a spreadsheet: a leak is one conversation move, not a form; No hand-written player text: the move and the story are worded by the English engine; Placeholders: the SG-PEOPLE-press-favors-and-leaks row closes only when leaks run; Look before you ask: read DECISION-REGISTER.md on press endorsements before touching coverage.

**Done when.** A test in src/core2/press.test.ts, in a drawn place (buildBenchWorld, seed named in the PR body), follows a leak record id, a story record id and a reader's view record id, and the stopgap row closes. The owner plays it: A leak as a conversation move that puts a record on a reporter's wire.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, src/director/conversation.ts, data/english/parts/conversation.json, src/core2/data/stopgaps.json

**Notes.** Checklist line from OPUS-PEOPLE.md; verify against main before starting.
