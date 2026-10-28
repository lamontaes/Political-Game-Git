---
id: wire-opening-and-home
title: "Wire the opening and home: the address through the scene engine, the night's news from the news engine, Money from the accounts, the Journal from the one history, the generator deleted"
area: director
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Engine map (docs/reports/engine-map-2026-10-28.md) lines 1, 2, 3, 4, 6, 7, 8, 9 and 31. The address plays as the existing address situation type through scheduleMoment (src/director/scheduling.ts:672) and the kit talk box (src/bench/ui/talk-box.mjs); the stage list (src/director/opening-sequence.ts), the picture table (src/bench/data/opening-pictures.json) and castOf (src/bench/opening.ts:130) are deleted. The first night's news comes from printStory (src/core2/modules/news.ts:532) and composeNewsStory (src/english/english-newscast.ts:263); newsStory and townStory in src/director/opening-story.ts are deleted. Inaugural or State of the Union is read from the inauguration record (recordInauguration, src/core2/modules/offices.ts:621), never the year. National officials are filled in by fillInIdentity (src/core2/state.ts:2557) at their home state with a stored look. The Money sheet reads src/core2/accounts.ts through bankView (src/bench/bank.ts:6) or loses its four empty sections. The years before the start run through preStartHistory (src/core2/pre-start.ts:141): moves and schooling after the working life; buildDeepPast (src/core2/deep-past.ts:208) and its two live callers (src/bench/world.ts:337, src/core2/births-people.ts:156) are deleted. composeJournal (src/director/journal.ts:599) reads the pre-start history and the running log by record kind as one story, no heading per person. Planned acts run in the one day loop (advanceCore, src/core2/life.ts:535; closeDay in src/core2/player-v1.ts:517 folds into it). The past writes news through printStory, keeps one past-elections writer and one closures writer, and drops the four unread past tables. Time box: 6 hours.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0): a missing piece is a registered stopgap naming the engine. Every cut corner a registered stopgap. The guards on main (npm run guards, sixteen ids in scripts/guards/index.ts) pass on every PR; a shrinking baseline is lowered in the same PR. Sessions never message; the channel block and PR bodies are the record. One PR per line; mergers merge on green; a golden-path red that reproduces on clean main does not block. Guards that hold this: kit-only-ui, one-history, no-second-source, families.

**Done when.** In a drawn place from all 56 (name it and the seed): a new life at 35 opens with the address staged by the director (moment and scene record ids named), the first night's paper is a news-engine story (record id), the Money sheet shows cash, spending, assets and debts from the ledger, and the Journal reads one story from pre-start and durable records (kinds named); two seeds give two different Journals; the deleted files are gone (grep named in the PR bodies); the one-history guard's proxy list is shorter by the kinds the generator wrote.

**Files.** src/director/opening-sequence.ts,src/director/opening-story.ts,src/bench/opening.ts,src/bench/data/opening-pictures.json,src/core2/deep-past.ts,src/core2/pre-start.ts,src/director/journal.ts,src/bench/bank.ts,src/core2/life.ts,src/core2/player-v1.ts,src/core2/past-news.ts

**Notes.** Filed by the CTO from the engine map on the owner's go (Oct 28). engine: scheduleMoment, printStory, preStartHistory, accounts.ts, advanceCore. guard: kit-only-ui, one-history, no-second-source, families. Read: OWNER-DECISIONS (Oct 27-28), the engine map, duplicates report; pool: director-opening-as-a-scene, play-opening-plays-in-the-talk-box, history-past-moves, core-old-imports-opening-people are consumed by this item. Starts wiring when the Trim block says the opening deletions landed.
