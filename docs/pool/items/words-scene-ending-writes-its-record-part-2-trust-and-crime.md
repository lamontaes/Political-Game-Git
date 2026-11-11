---
id: words-scene-ending-writes-its-record-part-2-trust-and-crime
title: "Trust-lost and bribe-taken endings write the trust change and the crime row"
area: words
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/pool-words-scene-ending-writes-its-record-part-2-trust-and-crime
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: design-story-director
source: split from words-scene-ending-writes-its-record in the pool redo, Nov 10, 2026
standard: 2
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:58:34.976Z
branch: claude/pool-words-scene-ending-writes-its-record-part-2-trust-and-crime
---

**What.** Endings that keep "trust-lost" (16 endings) and the bribe endings (bribe-taken, bribe-reported, bribe-refused, bribe-promised, bribe-pending) write only a label. Make them write the trust change and the crime row through the writers the relationship, corruption and crime modules already have. The records are then read by the engines that decide trust and charges.

**Cause.** Found in code: src/director/data/purpose-arcs.json endings carry keeps "trust-lost" and the bribe-offer ending keeps (line 3729 onward) that src/director/scene-talk.ts reads only into the ending's label; src/core2/modules/corruption.ts (line 620) already listens for scene.reply and src/core2/modules/crime.ts holds the crime rows.

**Fix.** Have a trust-lost ending write the trust change through the relationship writer, and a bribe-taken ending write the crime row state through the corruption and crime modules, citing the scene.reply id.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No consequence, no scene (scene-standard rule 1). An effect is a read, not a record: the ending calls an existing engine writer and never invents a parallel table. No dice: the record follows the ending the player chose, never a roll. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, not the builder, plays a year in a drawn place (buildBenchWorld, place and seed named), ends a scene on trust lost and one on a bribe taken, and finds the trust change and the crime row state by record id, each read by a different engine on a later day.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/director/scene-talk.ts, src/director/data/purpose-arcs.json, src/core2/modules/corruption.ts, src/core2/modules/crime.ts

**Notes.** Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:51 UTC) on branch claude/pool-words-scene-ending-writes-its-record-part-2-trust-and-crime.

Released (2026-11-11): Not built: the favor endings need an ObligationRow (legislature.ts: owedBy, owedTo, kind, billId, measure, date, settled) but a scene favor has no bill, and the promise endings (79) need a campaigns promise record the engine reads; neither shape is settled and guessing would add a second record. Read purpose-scene.ts line ~1880 (the one writer of scene.reply, which carries ending and keeps). Needs the legislature/campaigns lead to say where a bill-less favor and a scene promise live. Continue on branch claude/pool-words-scene-ending-writes-its-record-part-2-trust-and-crime.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:58 UTC) on branch claude/pool-words-scene-ending-writes-its-record-part-2-trust-and-crime.
