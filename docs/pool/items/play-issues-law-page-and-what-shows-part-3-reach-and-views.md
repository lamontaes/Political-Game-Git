---
id: play-issues-law-page-and-what-shows-part-3-reach-and-views
title: "A law's page shows who it reaches here and what people think of it"
area: play
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: play-issues-law-page-and-what-shows-part-2-law-page-summary
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
milestone: play-first
source: split from play-issues-law-page-and-what-shows in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A law's page should say who the law reaches here, in people and in the place's terms, and how people and parties feel about it, from the records. The law engine keeps reach rows (the card already reads them as `lawEffects`), and views keep stored stances for the questions the survey asks. The Nov 9 audit found that after a law passes, no screen shows the people it reached.

**Cause.** Found in code: `lawPage` in src/bench/play.mjs (line 5059) reads neither the law engine's reach rows (`reachOn`, src/core2/law-reach/host.ts, used by src/bench/card.ts line 190) nor the stored stances (`openingStance` in src/core2/modules/views.ts); the page has no reach or views section.

**Fix.** Add a reach section (who the law reaches here, counted from the reach rows, with counts for the player's own household when it reaches them) and a views section (the town's lean on the law's question from stance records, in words; when nothing is known, say why in words) to `lawPage`, each citing record ids. Where the engine side is thin, say so in plain words; engine changes stay with the laws lead.

**Time box.** 4 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** An effect is a read, not a record: the page reads the law engine's reach rows and the views module's stances and computes nothing of its own. Ask why: every count cites its record ids in Trace. This is a game, not a spreadsheet: reach and views are told in a line or two of words, not a table. No hand-written player text.

**Done when.** A second session, in a drawn place (named with its seed) after a law passed in play, opens that law's page in Issues and finds who it reached here (counts matching the reach rows in a test, with record ids) and the town's lean on it in words, or a worded reason when nothing is known, shown by a screenshot at 1440x900.

**Waits on.** Nothing. play-dev-reach-reads-every-effect-record improves what the reach rows hold but is not needed to show them.

**Files.** src/bench/play.mjs, src/bench/card.ts, src/bench/government.ts, src/core2/law-reach/host.ts, src/core2/modules/views.ts

**You will see.** A law's page tells you who it reaches here and how the town feels about it.

**Screenshot.** One passed law's page with reach and views, in a drawn place.
