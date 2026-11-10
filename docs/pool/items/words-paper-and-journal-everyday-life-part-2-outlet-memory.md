---
id: words-paper-and-journal-everyday-life-part-2-outlet-memory
title: "An outlet does not repeat a context sentence it printed for the same race lately"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on: CTO call between outlet memory (this part) and roundups (words-paper-and-journal-everyday-life-part-1-race-roundups), not yet ruled
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
source: split from words-paper-and-journal-everyday-life in the pool redo, Nov 10, 2026
standard: 2
---

**What.** composeNewsStory words one story at a time, so a paper prints the same context sentence for a race in every story about it. Give each outlet a memory of the context sentences it printed for a race lately and skip one already printed. Repeats should fall without hiding any story. The memory comes from what the outlet printed, not from a new table.

**Cause.** Found in code: `composeNewsStory` (src/english/english-newscast.ts) words one story at a time, and the archive wording in src/bench/archive-words.ts calls it once per story id, so neither keeps what an outlet already printed (Lane 3 note, Nov 4).

**Fix.** Pass a per-outlet memory of printed context sentences, by race, into composeNewsStory from the printed-words path and skip a sentence already printed lately; the memory is derived from what was printed, not a new stored table.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: words come from the banks. Wire to the world: the story prints from a record an engine writes, cited by record id. One rule, all 56 places: no place is named in logic. Speed: the memory is read when a story is composed and never scans the whole paper each day.

**Done when.** A second session, not the builder, replays a played year in Rote, Pennsylvania (seed kinds:2) and in one other drawn place it names and sees, in the played-year table, no context sentence repeated for the same race by the same outlet within the lately window, with every story still printed; printed-words tests pass.

**Waits on.** The CTO's call between this outlet memory and the roundups of words-paper-and-journal-everyday-life-part-1-race-roundups; build only the one the CTO names.

**Files.** src/english/english-newscast.ts, src/bench/archive-words.ts, src/bench/printed-words.ts, src/bench/printed-words.test.ts
