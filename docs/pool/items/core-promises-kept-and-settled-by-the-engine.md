---
id: core-promises-kept-and-settled-by-the-engine
title: "A promise is kept, settled and felt in the engine; the director only says it"
area: core
kind: bug
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: high
root: none
source: acting CTO's read of the frozen train (#9052 at 892427ec), Nov 15, 2026; owner the same day, "Okay, so promises. Yes, with your recommend."
checked: fable 2026-11-15
---

**What.** When someone gives their word in a scene (a vote, a rent paid on time, coming to a meeting, holding a position), the game remembers it, decides later whether it was kept or broken, and warms or cools the tie between the two people. Today the director does all of that by itself, and the simulation never holds the promise. The owner ruled on Nov 15 that the train merges as it is and this move is the first follow-up, and that no new promise kind is added in the director until it lands. Seen: nothing wrong on screen today; the fault shows the day another engine needs to know a promise was broken (a vote count, a bargain, a news story, a save), because only the director can answer.

**Cause.** Found in code: src/director/promises.ts (new on the train, 630 lines) keeps every open promise on the director's ledger (`KeptFact.promise` in src/director/types.ts, indexed by `promisesBySettle` and `promisesDue`, created in src/director/ledger.ts `produceKeptFacts`). `settlePromisesOnEvent` in that file rules a promise kept or broken from the legislature's roll (`votesOn`), a meeting's record, a missed payment or the window's close, and `endPromise` then moves the tie through `api.relationship`. src/director/promise-talk.ts works out how much an apology wins back from the person's traits. The kinds and their windows are director data (src/director/data/promise-kinds.json). The only reader of an outcome is the director's own `promisesBetween`. The standing rule (owner, Oct 27 and 28) is that the simulation is the one layer that knows anything and a view that stores or decides its own version of a fact is a duplicate. The engine already keeps two promise records of its own that this does not read: the legislature's `vote-promise` rows (src/core2/modules/legislature.ts) and the campaigns module's `promises` table.

**Fix.** One engine module holds a promise: who gave it, to whom, its kind, the record that settles it, the day its window closes, and how it ended. Move the kinds table and its window parameters under src/core2/data, move the settlement (`settlePromisesOnEvent`, the window close, `endPromise` and the tie it moves) into that module on the same events it reads today, and fold the legislature's `vote-promise` and the campaign promise rows into it or read them through it, so there is one record of a promise. The scene reply that makes a promise calls the module; the director's ledger keeps no promise of its own and reads open and ended promises from the module for its talk lines (promise-talk.ts keeps only the wording and the choice of line). The apology's effect on the tie is the module's, with its trait weights as parameter rows. Delete the director's indexes and settlement in the same change and count what was removed. Nothing a player reads changes; no line is added.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the simulation is the one layer that knows anything, and every scene, journal entry and talk line is a view of its records. Replace, never layer: the director's promise store and settlement are deleted in the same change that adds the engine's. An effect is a read, not a record: another engine reads the promise's ending where it decides.

**Done when.** In the played world (buildBenchWorld, drawn place named with its seed), a promise made in a scene is a row in the engine's table, its ending is written by the engine on the day the settling record lands, and the tie's change cites that row by id. src/director holds no promise index and no kept-or-broken decision (a grep for `promisesBySettle`, `promisesDue` and `endPromise` under src/director finds nothing), and the existing promise tests pass against the engine's rows. A second session, not the builder, plays a drawn place to a kept and a broken promise in the running game and sees the same talk lines as before, with the engine's row ids in dev mode's trace.

**Waits on.** Nothing.

**Files.** src/director/promises.ts, src/director/promise-talk.ts, src/director/ledger.ts, src/director/types.ts, src/director/data/promise-kinds.json, src/core2/modules/legislature.ts, src/core2/modules/campaigns.ts, src/core2/modules/ (new module), .agents/skills/promises/SKILL.md

**Notes.** Nov 15, acting CTO: the same shape, smaller, was found beside it and belongs with this item's builder or a follow-up: the yes or no of an ask to serve is worked out in src/director/purpose-scene.ts and src/director/scene-talk.ts from the serve-asks engine's terms, and the engine takes the scene's ending as its verdict; the engine should return the verdict for each branch.
