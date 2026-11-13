---
id: words-player-trait-reads-fire
title: "The director's three trait reads in the player's conversations show calls in a played year"
area: director
lead: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "Traits lead, Oct 28 (traits-decisions-fire-in-play)"
after:
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** Three personality decisions belong to the director and never fire in the trait audit's played year, because only the player's own conversations start them: bring-it-up.blame (src/director/bring-it-up.ts, reached from the bench handler), conversation.reply-reach (src/director/conversation.ts, the ranking of replies offered to the player) and scene-talk.move (src/director/scene-talk.ts). Measured Oct 28 on main in place 2474560, seed 092b17e0e593, election window December 3, 2025 to December 3, 2026: 0 calls each, while 78 of 91 decisions ran. The audit plays the world with no player acting, so it cannot see them; a played year in which the player talks to people should. Seen: replies offered in a talk and a person's move in a scene follow their traits; today those three reads never run in a played year (words machine).

**Cause.** Measured: place 2474560, seed 092b17e0e593, election window December 3, 2025 to December 3, 2026 (Oct 28, run under scripts/traits/trait-wiring-audit.ts): bring-it-up.blame (src/director/bring-it-up.ts), conversation.reply-reach (src/director/conversation.ts) and scene-talk.move (src/director/scene-talk.ts) had 0 calls each while 78 of 91 decisions ran, because only the player's own conversations start them and the audit plays with no player acting.

**Fix.** Run the trait probe over a played year in which a scripted player opens conversations through src/bench/handler.ts (the golden-path runner's steps or a short script) and show the three decisions with calls above zero.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: each read is shown in a played year of `buildBenchWorld` where the player opens conversations through the bench's own handler, named by record id. No dice: the speaker's traits and the situation pick the line, never a roll. Every system is already built: drive the existing player path, no new conversation engine.

**Done when.** A second session, not the builder, runs a played year of buildBenchWorld in a place drawn from all 56 (place and seed named) with the player opening conversations through src/bench/handler.ts under the trait probe (setTraitProbe, as scripts/traits/trait-wiring-audit.ts does) and sees bring-it-up.blame, conversation.reply-reach and scene-talk.move each with calls above zero, a scene or conversation record id each, and the trait lean that moved it; the traits lead regenerates the matrix from that run.

**Waits on.** Nothing.

**Files.** src/director/bring-it-up.ts, src/director/conversation.ts, src/director/scene-talk.ts, scripts/traits/trait-wiring-audit.ts, tests/golden-path/runner.mjs, src/bench/handler.ts

**Notes.** Filed Oct 28 by the traits lead (Needs from others in the Traits section of docs/coordination/LEADS-2026-10-24.md). The traits lead does not write in src/director or src/bench.
