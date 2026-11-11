---
id: words-scene-ending-writes-its-record-part-1-favor-and-promise
title: "A scene that ends with a favor owed or a promise made writes it where an engine reads it"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
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
claimed-at:
branch: claude/pool-words-scene-ending-writes-its-record-part-1-favor-and-promise
---

**What.** Scenes whose endings keep "favor-owed" (16 endings) or "promise" (79 endings) write only the label. Make those endings write a favor owed or a promise on the record the legislature, the relationship record and the campaigns engine already read, so a favor can be called in and a promise held against the player. The journal should tell it from that record.

**Cause.** Found in code: stopgap SG-WORDS-favor-promise-keeps-unread (src/director/data/stopgaps.json, line 436): no engine reads keeps; the favor belongs to the legislature's obligations (obligationsOf, src/core2/modules/legislature.ts line 3592; keepReply line 422) and the relationship record, the promise to the campaigns engine's promises.

**Fix.** In src/director/purpose-scene.ts, have a favor-owed ending write through the legislature's keepReply and the relationship record, and a promise ending through the campaigns engine's promise record; have the journal say it from that record; then resolve the stopgap.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No consequence, no scene (scene-standard rule 1). An effect is a read, not a record: the ending calls an existing engine writer and never invents a parallel table. No dice: the record follows the ending the player chose, never a roll. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, not the builder, plays a year in a drawn place (buildBenchWorld, place and seed named), ends a scene on a favor owed and one on a promise made, and finds each as a record by id, read later by the legislature or campaigns engine (record id named), with a dated journal line; SG-WORDS-favor-promise-keeps-unread is deleted from src/director/data/stopgaps.json.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/director/scene-talk.ts, src/director/data/purpose-arcs.json, src/core2/modules/legislature.ts, src/core2/modules/campaigns.ts, src/director/data/stopgaps.json

**Notes.** Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:50 UTC) on branch claude/pool-words-scene-ending-writes-its-record-part-1-favor-and-promise.

Released (2026-11-11): Not built: the favor endings need an ObligationRow (legislature.ts: owedBy, owedTo, kind, billId, measure, date, settled) but a scene favor has no bill, and the promise endings (79) need a campaigns promise record the engine reads; neither shape is settled and guessing would add a second record. Read purpose-scene.ts line ~1880 (the one writer of scene.reply, which carries ending and keeps). Needs the legislature/campaigns lead to say where a bill-less favor and a scene promise live. Continue on branch claude/pool-words-scene-ending-writes-its-record-part-1-favor-and-promise.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:57 UTC) on branch claude/pool-words-scene-ending-writes-its-record-part-1-favor-and-promise.

Released (2026-11-11): a builder claimed this and did not start it (its draft said so and left the claim in place); Fable B released it so another builder can take it.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 05:27 UTC) on branch claude/pool-words-scene-ending-writes-its-record-part-1-favor-and-promise.

Released (2026-11-11): Claimed by my own next loop, not worked: each needs Story-session lines under data/english/parts, a dedicated machine for speed runs, or a rewrite beyond one pass (see my earlier release notes on this item). Continue on branch claude/pool-words-scene-ending-writes-its-record-part-1-favor-and-promise.
