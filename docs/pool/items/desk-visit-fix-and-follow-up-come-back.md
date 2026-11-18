---
id: desk-visit-fix-and-follow-up-come-back
title: "A mayor or governor who tells a sponsor 'bring me the fix and I'll sign it' never sees the fix come back, so the three fix replies are cut"
area: words
kind: feature
priority: 3
size: M
status: open
standard: 2
after: play-executive-bill-comes-to-the-desk-after-it-passes
blocked-on: "#9192"
lead: words
source: Account lead ruling on #9292 (desk visit thread), Nov 14, 2026, from the second reader's points 1 and 2
model: sonnet
effort: medium
root: none
---

**What.** At the desk visit the sponsor of a passed bill asks the player to sign it. Three replies once let the player sign on a condition: "Bring me a fix and I'll sign it.", "Bring me the fix in writing, and I'll sign it." and "Give me your word on a follow-up, and I'll sign." The cleanup-bill reply ("I'll sign it if you take a cleanup bill to the floor.") was one too. Nothing in the game brings the fix back or holds the sponsor to the word given, so #9292 cut all four. This item brings them back once the game can keep them. Seen: the player asks for a fix, the sponsor agrees, and days later the sponsor returns with the amending bill (or the word given shows in the player's promises), and the player signs at that return.

**Cause.** Found in code: `replyInScene` in src/director/purpose-scene.ts signs or vetoes only through `purposes.desk-visit.deskActs`. The fix-first ending in src/director/data/purpose-arcs.json keeps "promise", but no engine reads a fix promised by a sponsor, and no scene stages a sponsor bringing a fix back. A promise record for the player's talks is #9192's work, and it is not yet on the train.

**Fix.** After #9192 folds, record the sponsor's word on the fix-first ending through #9192's promise record, not a second one. Stage the return as a desk visit caused by that promise's due date, or by an amending bill the sponsor drafts through `draftBill` in src/core2/modules/legislature.ts. Restore the four replies from #9292's removed list, with "Give me your word on a follow-up, and I'll sign." signing at once through `decideDesk` when the word is given. The player sees the sponsor come back, and the Journal says whether the word was kept.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places. Replace, never layer: one promise record and one desk. No dice: whether the sponsor keeps their word comes from their traits and the bill's record. The Words lead reads every restored line played.

**Done when.** A second session plays a desk visit in two drawn places, asks for the fix, sees the sponsor return with it, and signs; and gives a follow-up word, sees the bill signed at once and the promise on the record, by record id.

**Waits on.** #9192 (promises kept, broken and remembered) folding into the train.

**Files.** src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, src/core2/modules/legislature.ts

**Notes.** Look-first, Nov 14: searched docs/pool/items for desk, fix, follow-up and cleanup bill. The neighbors are play-executive-bill-comes-to-the-desk-after-it-passes (#9292's item) and the bargaining thread's carry-a-bill act, which has no code on the train.
