---
id: words-talk-ends-as-soon-as-it-starts
title: "Hard news gets one reply and a goodbye: 'Your grandfather is seriously ill.' 'Oh, no. Give Bob my best.' 'I'll talk to you later.' (As Matuis, Northern Mariana Islands)"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 5 and Pillar 4)
checked: fable 2026-11-10
---

**What.** When someone brings the player hard news, the talk closes after the player's first reply. Measured by the audit, forced through dev mode in As Matuis, Northern Mariana Islands: the player's mother, Deborah Meadows, said, "Your grandfather is seriously ill." The player answered, "Oh, no. Give Bob my best." She said, "I'll talk to you later," and the scene was over. Measured in the audit's browser play (Blodgett Landing, New Hampshire, no seed kept): the aunt said, "We're being evicted." The player said, "How can I help?" She said, "I'd better get going." Measured on Nov 10's main (commit 8ac2262853) with the crew's scene tool: in Tesuque, New Mexico (seed 8a5d1fba28fc) the mother says "Come sit with me." "We have to move." The player asks, "Wait. We have to move?" and she closes with "We'll talk more later."; Odessa, Washington (seed fd7e212758b7) ends the same way with "Let's talk more tomorrow, okay?" News of a relative's illness is the kind news-arrives, which has no purpose and no reply tree, so it plays as everyday talk. The kind care (purpose care-visit) has lines of its own but casts the player as the one who is ill, and the kind visit (the player goes to see an ill relative) has no purpose either. After any news line, a reply that asks, offers help or comforts must get an answer from the record the news came from (what the doctors said, since when, where the family will go, what would help), and the one who brought the news closes only after the player's reply has been answered.

**Cause.** Found in code: src/director/data/conversation-rules.json:158 (`tells`) has rows for a lost job, an eviction, a new job and the address, and none for an illness or a death; news-arrives (src/director/data/situation-types.json) has no purpose or reply tree. Why the eviction answer was not said in the Tesuque and Odessa runs was not traced.

**Fix.** Add answers for the asks, offers-help and comforts replies after any news line, drawn from the record the news came from, as bank pieces in data/english/parts/conversation.json and scene-talk.json, and add a purpose for news-arrives in src/director/data/purpose-arcs.json if that is simpler than more `tells` rows. Make the bearer's closing line come only after the player's reply has been answered. Fold in words-news-ask-gets-answer once it unblocks.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: every answer is a bank piece that names the record fact it needs (the health record's condition and date, the eviction case, the move's destination) and is said only when the record holds it. Wire to the world: each answer reads the record the news came from and cites it by id, and an offer of help the player makes is kept where an engine reads it or is not offered. Ask why: the bearer says only what they have a record of learning. Owner, Oct 15, 2026: "A yes or no never ends a talk; the asker follows up. Nobody closes with 'Talk to you soon' after a question was answered." If the fix is a purpose for news-arrives, it meets director-no-scene-without-a-purpose and director-no-borrowed-small-talk; talk to whoever holds those first.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and through dev mode's scene controls forces a serious illness on a relative of the player and then an eviction. For each it picks, in turn, the reply that asks, the reply that offers help and the reply that comforts, and takes a screenshot of the whole talk. It sees the next line answer that reply from the news record (named by record id in dev mode's trace), and no talk closes on the line right after the player's first reply. It runs the crew's scene tool on the same seed and on seeds 8a5d1fba28fc (Tesuque) and fd7e212758b7 (Odessa) (`node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed> --out <file>`): the eviction news no longer ends "Wait. We have to move?" "We'll talk more later." It repeats the forced illness in As Matuis, Northern Mariana Islands (typed into the Place field; the audit kept no seed). A director test opens every family-news talk of a played year and fails when the bearer's next line after a question is a close. The owner plays it: when his mother tells him his grandfather is ill and he asks about it, she tells him what she knows before she goes.

**Waits on.** words-news-ask-gets-answer, which adds the answers to a reply that asks after prison, illness and move-away news in the same `tells` table (src/director/data/conversation-rules.json). This item then adds only what that one does not: the answers to the offers-help and comforts replies, a death's answers, and the bearer's closing line coming after the player's reply. Talk first to the holders of director-no-scene-without-a-purpose and director-no-borrowed-small-talk if the fix is a purpose for news-arrives.

**Files.** src/director/data/conversation-rules.json, src/director/conversation.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, data/english/parts/conversation.json, data/english/parts/scene-talk.json

**Notes.** From the Fable audit, Pillar 5 ("A talk that ends as soon as it starts") and Pillar 4 (the aunt's goodbye in Blodgett Landing). The audit's banned-pattern test also let "I'll talk to you later." through and found 10 closers like it in the banks.

Nov 10 repro on main (commit 8ac2262853), scene-year.ts. Tesuque, seed 8a5d1fba28fc, 2026-11-21, kind news-arrives, cause event:housing.eviction:eviction:lease:household_65f2cdc6d798bc10:2026-11-06: narration "First thing on November 21st, Erica Reyes is at your door. Your mother has something to tell you the moment you're in.", then the four lines above. Odessa, seed fd7e212758b7, 2026-12-02, the same kind and shape. The tool picks the reply that asks when one is offered, so both runs show a question left unanswered even though `tells` has an eviction row; I did not trace why the eviction answer was not said.

Not verified: I did not replay either of the audit's two talks. The aunt's goodbye may be changed already: on Nov 9 evening a goodbye from someone moving away became a scene with lines of its own (kind moving-goodbye), after the copy the audit played. The illness news is unchanged by reading only. If the fix is a purpose for news-arrives rather than more `tells` rows, it meets director-no-scene-without-a-purpose and director-no-borrowed-small-talk; talk to whoever holds those first.

Related: words-news-ask-gets-answer (blocked on health-serious-illness-onsets-in-play; the same defect for a question after prison, illness and move-away news, filed earlier; this item adds the eviction, the offer of help and the comfort reply, and the audit's measured talks), words-home-news-talk (done; marked done, still shows), scene-household-quiet-day-talk (done).
