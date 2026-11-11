---
id: play-why-they-chose-on-screen
title: "A person's card says in a sentence why they made their last big choice"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
source: Oct 25 pool audit, on-screen pass (from traits-end-to-end-proof)
lead: play-first
milestone: play-first
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-play-why-they-chose-on-screen
---

**What.** The traits work makes two people in the same spot choose differently for recorded reasons, and traits-end-to-end-proof shows it in a test. The player sees choices happen (a neighbor quits, a cousin runs) but never why. Add one sentence to the card of a person who made a recorded decision, naming the decision and its leading reason, worded by the English engine from the decision record, so people read as people. When the person has no recorded decision, the card says why there is none in plain words.

**Cause.** Design: docs/play-first/LAW.md section 11 (the world on screen makes sense); `card.ts` (src/bench/card.ts) reads no decision record today. AGENTS.md ("Save why reasons only for the player and the people they deal with") limits it to those people. The decision record with reasons comes from traits-end-to-end-proof, which is open.

**Fix.** Add one English-engine sentence to the card of a person with a recorded decision, naming it and its leading reason from the decision record (a `person.acted` or `person.weighed` row in `core.durableLog` whose `decision` holds `selectedReasons`; src/core2/decision-detail.ts says how long each is kept and for whom), and say why when there is none. Build against what the engine gives today; where the engine side is thin the card says so in plain words.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the sentence is composed from the decision record's reasons by the English engine. Ask why: when the card has nothing to show, it says why in plain words, never a code or an empty box. Wire to the world: the sentence cites the decision record by id.

**Done when.** A second session (not the builder) plays a year in a drawn place on the bench (place and seed named) and clicks a person with a recorded decision: the card shows one sentence naming that decision and its leading reason, matching the decision record id in a test, shown by a screenshot at 1440x900 with the place and seed named. A person with no recorded decision shows the plain reason. The owner sees it on a person card in his own game without opening dev mode.

**Waits on.** Nothing. (traits-end-to-end-proof, which it once waited on, is done on main.)

**Files.** src/bench/card.ts, src/bench/words.ts

**You will see.** Click someone and read why they made their last big choice.

**Screenshot.** A person card with the sentence, from a drawn place, with the place and seed under it.

**Notes.** Filed by the Oct 25 pool audit: traits-end-to-end-proof's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with traits-end-to-end-proof (needs-from in the handoff line).

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:41 UTC) on branch claude/pool-play-why-they-chose-on-screen.

Released (2026-11-11): No English-engine wording exists for a decision's leading reason (src/english has no decision/reason module; reasons live in core2 decision records: choice.ts, trait-decisions.ts, decision-detail.ts), so the sentence needs new bank lines under data/english/parts, which a builder may not write; a control-name frame would be hand-written player text. Needs Words to add the bank piece first; the card read (person.acted/person.weighed rows with selectedReasons) is then small. Continue on branch claude/pool-play-why-they-chose-on-screen.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:50 UTC) on branch claude/pool-play-why-they-chose-on-screen.

Released by next (2026-11-11): no push to claude/pool-play-why-they-chose-on-screen since 2026-11-11 02:41 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-play-why-they-chose-on-screen.
