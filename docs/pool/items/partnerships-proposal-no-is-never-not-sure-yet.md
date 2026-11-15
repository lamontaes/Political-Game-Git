---
id: partnerships-proposal-no-is-never-not-sure-yet
title: "A proposal is never answered 'not sure yet': a partner's tie is always above what is typical, so every no is 'too soon'"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
source: "Family life thread, Nov 15, 2026, #9256 at 0bf3e4f54081e8008476b729cee2c63ce94ec929"
model: opus
effort: medium
root: none
---

**What.** The partnerships engine has two reasons for a proposal no, too soon and not sure yet. In play only too soon happens. Every proposal no in two card walks and in the ten-place replay was too soon. In the same path with the weekly visits stopped once the couple was together, the partner still never said not sure yet (Pulaski OH seed family-a: no once, then yes after a month; family-e: no eight times, all too soon, then yes). The three not-sure-yet lines were deleted from data/english/parts/scene-talk.json in #9256 because nothing reaches them: "I can't say yes. I'm sorry.", "I care about you. I'm not sure enough to say yes." and "I want to be sure before I say yes. I'm not there yet." A not-sure-yet no now has no words, so it would not play. Seen: the answer to Propose on a partner's card.

**Cause.** Found in code: `proposeWeight` (src/core2/modules/partnerships.ts, about line 1212) gives not sure yet only when the tie (closeness against what is typical for the partner, times the partner factor) is below how far along the couple is. A partner's closeness after dating stays well above typical, so the tie never falls below it.

**Fix.** None until the cause is weighed. Whether a partner can be unsure of a strong tie, and what in their record (wanting to marry at all, money, the household) would make them unsure, is the first step. Once a record makes it, write the lines again through the Words lead.

**Time box.** 2 hours, Opus at medium effort. When it runs out, write what was found in Notes and stop.

**Rules.** No dice: an unsure partner is one whose record says so, never a roll. Sliding scales and causes: no fixed share of unsure answers.

**Done when.** A played couple at a named place and seed reaches a proposal no with reason not sure yet through the game's own path, and its scene plays with lines a reader has stamped; a second session sees that answer after pressing Propose on a partner's card in the running game.

**Waits on.** Nothing.

**Files.** src/core2/modules/partnerships.ts, data/english/parts/scene-talk.json
