---
id: words-bribe-offer-rewritten-with-inserts
title: "A bribe offer asks about the bill or contract it buys, and the player answers from the favor, the envelope and where they stand"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9953
after:
blocked-on:
root: rc4-hand-written-words
lead: words
model: sonnet
effort: medium
source: owner, Nov 14, on the lines the world does not place, and Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The bribe's two scenes (`bribe-offer` and `bribe-pressed`, with the variants `.small`, `.large`, `.friend`, `.again`, `.desperate` and `.veiled`, `.open`, `.begging`, `.again`) held 389 fixed lines, 348 of them placed by nothing: every player reply was one stock sentence in every town, the envelope was never said by its size, and a lie had no record behind it. The scenes now ask about the bill or the contract the offer names, say the envelope in words, and the player answers from the favor, the envelope, the bids and the side their own recorded view puts them on.
Seen: an offer made to a seated member for a vote or a contract is staged from the engine's own record, the offerer talks about that bill or contract, the player's refusal says where they stood on it before the envelope came, and a taken offer leaves the engine's taken row.

**Cause.** Found in code: `excusedAs` in tests/guards/english/line-inserts.test.ts counts a line as placed when its use names any fact, and 348 of the 389 `bribe-offer` and `bribe-pressed` uses in data/english/parts/scene-talk.json carried no `requiresFacts`, `excludesFacts` or `onlyWhen`, so nothing placed them; and `composeBinding` in src/director/purpose-scene.ts set only `favor-vote` or `favor-contract` with the bill or contract, so no line could be placed by the envelope's weight, the bids on a contract, a bribe the player already said they would report, or the player's own side of the bill's question.

**Fix.** Delete the bribe lines placed by nothing and the ones that need a fact nothing sets (339 uses, 332 parts); keep what a record places and that carries a slot (50 uses) and the two old veiled `tell` replies a spot would otherwise lose; write the families the spec names (105 new lines, each seen said in the walk). Add `bribeReads` in src/director/bribe-facts.ts, called beside the favor block of `composeBinding`: `bribe-weight` (the crime record's amount against the household's days of living costs, said by data/bribe-weights.json), `bidders` (the contract's award row holds other bids), `reported` (a scene reply or a scandal the engine wrote, where the player said they would report), `your-side`, `stand-with` and `stand-apart` (the views engine on the bill's question). A refusal or confront sets `turned-down`, which the offerer's "thank you" and "don't take too long" closes exclude. The `read-public` fact is never worded: the arc-variants `public` read is kind `setting` with no `is`, so it reads true in every bribe scene. Lower scene-talk's count in tests/guards/english/line-inserts-baseline.json once the recount (#9757) lands.

**Time box.** 5 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets and none is typed in code. No figure in talk (rule 101): the envelope is said as words. Wire to the world: each fact a bribe line needs is read from the corruption engine's crime record, the contract award, the views engine or the scene replies, so a line plays only where its record holds.

**Done when.** In a drawn place (Town, State, seed nobody chose), a second session seats the player on a body with a bill before it and a council with a contract awarded, makes the offer with dev mode's bribe, presses every reply, and finds the envelope said in words, the player's stance line matching the views engine's answer by record id, the refuse leaving the offer handed back and the accept writing the engine's taken row. The line-inserts count for scene-talk is lower than before.

**Waits on.** The recount of the line-inserts count (#9757) before the count can fall.

**Files.** data/english/parts/scene-talk.json, src/director/bribe-facts.ts, src/director/data/bribe-weights.json, src/director/purpose-scene.ts, src/core2/modules/justice.ts, src/core2/modules/budgets.ts, src/director/bribe-reads.test.ts, scripts/words/bribe-walk.ts

**Notes.**

- 2026-11-17 (Story lead): drafted with a Sonnet writer. See the pull request for the counts, the played talks and the lines for the lead to sign.
- `read-public` is true in every bribe scene (arc-variants.json `public` is `kind: setting` with no `is`, so an undefined setting equals it), which also adds a constant 0.15 to the `.small` score; no line is placed by it. A fix needs the read to name a record that holds a public room, and the variants' weights rechecked.
- The arc's root has no `ask` reply (rule 29, "Why me?"): a gap that was there before this item and needs an arc change, not a line.
- A caught lie needs `knows-truth` and nothing sets it for a bribe at the offer, so the `caught` ending and the offerer's "source says" lines never play.
- The `bribe-pressed.veiled` variant (a high tie) never played in the walk's drawn places: the engine presses a friend rarely (the press weighs one minus the tie), so its new lines were not seen and came out; its `tell` replies keep their two old lines so the spot is not bare. The stance lines that open a scene (`your-side` in the request) are shadowed by each variant's own request and came out; the stance shows in the refuse, the accept and the thank.
- The pairs sheets for `reply-second-move-follows-the-first` and the narration sheet for `narration-assumes-no-reason` wait for fresh reviewers, so `tests/guards/english/line-rules.test.ts` reports two narration lines waiting until their verdicts are folded.
