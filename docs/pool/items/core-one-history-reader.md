---
id: core-one-history-reader
title: "One history reader on main: every view of what already happened reads historyOf"
area: core
kind: cleanup
priority: 1
size: L
status: claimed
standard: 2
claimed-by: history-reader
pr:
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: none
source: CTO, Nov 26, about 2 a.m. Eastern, from the owner ("the reader needs to be like the main, it needs to be in the core ... it needs to be a game-wide thing")
---

**What.** The one history reader (`historyOf`, src/core2/past-history.ts) gives every system the same events for a person, household, employer, place, state or the nation, each with its record id, date, cause and what it led to. It was built on story/first-evening (#10634 to #10641); this item puts it on main without the Story branch's word changes, so every engine and view on main reads one history.
Seen: a person card, the Journal, the news and the dev views name the same past records, by id; an obituary names where someone came from even when they were born before the history's window.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, the owner's Nov 25 rulings ("THE JOURNAL, DIRECTOR, PERSON CARDS, ETC ALL PULL FROM THE SAME HISTORY") and the CTO's Nov 26 order on #10377.

**Fix.** Apply #10634 to #10641 to main, commit by commit. Where a commit changed a file the Story branch had rewritten (the loading story, the Story-only address files, the Journal's chapter titles and first evening), main keeps its own version, and only the reader's change to code main also has is applied.

**Time box.** 6 hours.

**Rules.** Replace, never layer: each view's own past-builder is deleted in the same change that moves it onto the reader. No bank line, bank or scene is edited or deleted. No second store and no parallel system. Only views and the engines' history sources change; no engine decides differently.

**Done when.** Heavy checks on the pull request fail no test file outside docs/coordination/refactor/main-full-suite-fails-2026-11-25.txt (on claude/cto-playtest-nov23). A second session opens a person card and the Journal in a drawn place on main and finds each past line's record through dev mode's Trace.

**Waits on.** Nothing.

**Files.** src/core2/past-history.ts, src/core2/past.ts, src/core2/person-life.ts, tests/guards/one-history.test.ts, src/bench/history-reader-proof.test.ts

**Notes.** Nov 26: the port is on branch history/main.
