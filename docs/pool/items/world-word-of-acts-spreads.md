---
id: world-word-of-acts-spreads
title: "Nobody who was not there ever hears what you did: word of an act spreads from the people who saw it, by the speech's own retelling"
area: core
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: World B (session_01S4WSHrsirzMADEiASwJ6rk)
pr:
after:
blocked-on:
lead: governing
model: opus
effort: high
root: none
source: CTO overnight orders on the crew's thread #9747, Nov 17, 2026, 06:18Z ("Word of what you did spreads from the people who saw it. This is reputation built from what people saw. Owner: World B."); plan posted by World B at 06:20Z (comment 6940474226)
---

**What.** When the player confronts someone, snubs a reporter or speaks against an outlet, only the people in the room ever know. Nobody at their homes or among their friends hears of it, so what the player does never becomes what the town says about them.
Seen: after the player speaks against the town's paper, no one but its staff and the room holds any record of it.

**Cause.** Found in code: the retelling engine exists only inside `deliverSpeech` in src/core2/modules/speech.ts (the KEEP or RETELL choice, the household and the closest ties, belief by closeness to the teller). No other act reaches it: `grievance.confronted` (drives.ts), `press.snubbed` and `press.attacked` (press.ts `snubbed`) are seen by their witnesses or the people they were done to, and stop there.

**Fix.** The retelling leaves `deliverSpeech` as `retellAmong`, one function both callers use. The speech module answers the acts listed in src/core2/data/speech/word-kinds.json (who saw it, whom it is about) with `spreadWord`: those who saw it weigh telling it with the same choice, from how hard it struck them (the event's own appraised impact). A hearer who believes the teller learns `word:<event>:heardFrom` (read with `heardFrom`), and a `word.retold` event carries the act to them; the drives engine perceives the act itself for each hearer as a witness of it (drives.json `eventKinds.wordRetold`). Retelling rows are dropped by their own date. The player sees it as people who were not there knowing what they did.

**Time box.** 4 hours for one top-model session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: telling, hearing and believing are each a person's choice from their own record. One rule, all 56 places: every listed act spreads the same way. One model, two tiers: a counted person is not told (as with a speech's retelling today); a counted group's hearing is the next part. Knowing is a read: what a person knows of someone is what they saw and were told, with no reputation table.

**Done when.** A second session starts the bench in a drawn place, speaks against the town's paper through the game's own call, and sees in dev mode that someone who was not there knows it and from whom. `npx vitest run src/core2/word-spreads-played.test.ts` passes there (set WORD_SEED to replay); on main nobody outside the room holds any record of the act.

**Waits on.** Nothing.

**Files.** src/core2/modules/speech.ts, src/core2/data/speech/word-kinds.json (new), src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/word-spreads-played.test.ts (new)

**Notes.** Next: grudge and favor kinds join word-kinds.json as World records them; a retelling's hearers retell it on (one remove only for now); counted hearers as groups (`hearAsGroups`); the act's Trace in dev mode (Laws and effects owns the Trace box).
