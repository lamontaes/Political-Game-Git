---
id: dev-journal-line-shows-the-records-it-was-written-from
title: "Dev mode cannot show which records wrote a Journal line or why a chapter opened"
area: words
kind: wiring
priority: 2
size: M
status: open
standard: 2
model: sonnet
effort: medium
root: none
after:
claimed-by:
pr:
blocked-on:
lead: words
source: owner, Nov 16, 00:59Z, "if it's not already being traced by the dev mode, it should be being traced by that"
claimed-at:
---

**What.** Every Journal line already carries the records it was told from (`sourceRecordIds`, `momentIds`), and `/api/journal` returns them, but nothing in dev mode shows them: a person's card in dev mode opens a record by id (src/bench/ui/dev-records.mjs, `recordTree`, the trace box), yet the Journal screen shows only the text, so finding why a line was written, from which record, which wording was eligible and why a chapter opened or closed took a script or a read of src/director/journal.ts. The owner asked on Nov 16 that whatever is traced by script or by reading code be traceable in dev mode. Seen: in dev mode on the Journal screen, each line gets a Trace control that opens its records one click at a time.

**Cause.** Found in code: src/bench/handler.ts (`/api/journal`, line 830) sends the composed chapters whole but the Journal screen (src/bench/play.mjs, around 4305) draws line text only; src/bench/ui/dev-records.mjs and dev-trace-box.mjs are the one trace that opens a record by id, and nothing hands them a Journal line's ids. A chapter carries no reason it opened (the record that opened it and the title rule), and a line carries no list of the wordings that were eligible for its moment.

**Fix.** Reuse the one trace: in dev mode only, each Journal line shows a Trace control that opens `sourceRecordIds` in the trace box; the composer adds, for each chapter, the line that opened it (`opened: { momentId, kindPrefix }`) and for each line its part key and the other eligible keys (read from the `render` call, kept only while bookkeeping is on, as the bench keeps other reasons); the screen reads them and words them through the labels file. No second tracing system, no copy of the facts.

**Time box.** 5 hours.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there (owner, Nov 14): a Journal line is an effect of its records, and the trace shows them. Bookkeeping is a debug switch: the extra fields exist only in dev mode and tests, never in play. Words come from labels, never raw kinds or ids on the player's screen. Read-only: opening a trace spends no game time.

**Done when.** In a played world built with buildBenchWorld at a named place and seed, in dev mode, a second session opens a Journal line's Trace and sees its records and the other eligible wordings, and opens a chapter's trace and sees the record that opened it, by record id in the trace box; in play (dev mode off) none of it appears.

**Waits on.** #9119 folded.

**Files.** src/director/journal.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/ui/dev-records.mjs, src/bench/ui/dev-trace-box.mjs
