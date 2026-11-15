---
id: director-rally-opponent-names-a-debate-the-player-skipped
title: "A rival asks how the debate went when the player never sat for it"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: campaign events report 1, Nov 14 2026
checked:
---

**What.** The day before the vote the director stages `rally-opponent` with the rival opening "So. How do you think that went?", in every contested campaign, including one where the player declined or never answered the debate's invitation (Lookout Mountain GA, seed `q1` on the first script version: the debate was held without a sitting). The line asserts a debate the player did not attend. Seen: the day before the vote, a rival speaks to the player about a debate they never sat for.

**Cause.** Found in code: the `rally-opponent` type's second cause row matches `cause:event:debate` with `selfNamed: true` in src/director/data/situation-types.json, and the meetings engine writes the `debate` record whenever the debate is held, with or without the player's answers (`holdDebate`, src/core2/modules/meetings.ts); nothing in the match reads whether the player sat for it.

**Fix.** Match the `debate` cause only where the held debate holds answers by the player (a `causeFacts` row naming the player among the candidates who answered); with no sitting the type waits for its other cause (a rival's message in the street) or the rival's word, and the debate-held-without-you case becomes the rival-word scene's own business. No new store.

**Time box.** 2 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: a scene names a debate only when the player's own answers are on the held debate record. One engine. Review: words.

**Done when.** A second session plays a contested campaign in a drawn place with the seed named, declines the debate, and sees no rally-opponent scene after it; accepts it in another run and sees the scene with the debate's record id as its cause.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/core2/modules/meetings.ts

**Notes.** Evidence: /mnt/project-files/words-lead/campaign-events/report-1.md.
