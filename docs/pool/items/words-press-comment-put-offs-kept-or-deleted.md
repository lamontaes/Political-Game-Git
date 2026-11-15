---
id: words-press-comment-put-offs-kept-or-deleted
title: 'A reporter told "ask me next week" never asks again'
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: words-put-off-is-kept-on-the-record-or-not-offered
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: Found by the short-replies builder on the put-offs branch, Nov 15, 2026; the Words lead asked for it filed and sorted (ruling of 10:34Z, item 4)
---

**What.** A reporter asking for a comment (purpose `press-comment`) offers stalls that promise a later answer ("Give it a month. Then you get a real interview.", "Ask me next week, when there's more to say."). Nothing keeps the promise: the reporter never comes back, and the press engine records no comment. Only "Let me check and call you back today." is kept, by the put-offs item's call back. Seen: a reporter's comment scene in play, where the reporter told to ask next week never calls.

**Cause.** Found in code: `keepPutOffComment` in `src/core2/modules/press.ts` schedules a call back only for that one stall (it requires `can-call-back`, a bill still drafted). The other stall pieces in `data/english/parts/scene-talk.json` with a `press-comment` reply use of move `stall` have no row in `scene-talk-rules.json` `callBack.said` and no record that waits on the day they name.

**Fix.** Sort the 28 other stalls (Words lead, Nov 15, 10:34Z): a refusal that promises nothing stays; a true put-off that promises a later answer either gets a call back on the day the record gives (a committee report, a hearing, the vote, a week, a month) through `keepPutOffComment`, or is deleted from the bank.

Refusals that promise nothing (stay): they-ll-see-when-i-vote; you-ll-have-it-the-same-day-everybody-else-does; its-too-early-to-say; im-still-reading-the-latest-draft; i-havent-seen-the-final-language; id-rather-not-get-into-it-today; i-have-nothing-to-add-to-how-i-voted; im-not-talking-about-that-vote; i-heard-you-the-first-time-not-today; im-not-going-to-answer-that.

True put-offs (a call back on the named day, or delete): give-it-a-month-then-you-get-a-real-interview; let-me-see-how-the-first-weeks-go-then-ask-me-again; ask-me-in-a-month-when-there-s-something-to-measure; give-me-time-to-see-it-work-before-i-answer-for-it; i-ll-tell-them-first-then-you; when-there-s-a-deal-you-ll-hear-about-it-first; ask-me-again-when-the-dust-settles; ask-me-again-when-it-s-out-of-committee; ask-me-next-week-when-there-s-more-to-say; give-me-a-week-and-the-first-hearing; i-ll-answer-that-after-the-hearing-on-the-record; give-us-a-month-to-get-the-word-out; you-ll-get-a-sentence-at-the-press-conference; let-me-have-my-office-send-you-a-statement; ill-have-more-when-the-committee-reports; well-know-more-next-week; let-me-look-at-the-numbers-first; i-want-to-hear-from-the-people-i-represent-first.

**Time box.** 3 hours, Opus.

**Rules.** A put-off is kept on the record or not offered (Words lead, Nov 15, class E). An effect is a read, not a record. Lines by the Words lead, judged by M5.

**Done when.** In the played world (buildBenchWorld) at one pinned place and one place drawn from all 56 (named with its seed), each kept put-off is said to a reporter and the reporter calls back on the named day by record id, and every deleted piece is gone from the bank. A second session sees it in the running game.

**Waits on.** The put-offs item merging.

**Files.** src/core2/modules/press.ts, src/director/purpose-scene.ts, src/director/data/scene-talk-rules.json, data/english/parts/scene-talk.json

**Notes.** Filed by hand on the put-offs branch, Nov 15. Words lead, Nov 15, 10:40Z: "Let me look at the numbers first." and "I want to hear from the people I represent first." are true put-offs, since "first" promises an answer later; they go with the others (18 in all): a call back or deleted.
