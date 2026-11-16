---
id: words-player-news-work-reply-reads-the-job-held
title: "After the player leaves a job, the reply and its answer talk about work there as if they still had it"
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
source: "Second reader's stamp on #9567, Nov 15, 2026 (/mnt/project-files/words-lead/played-talks/lines-player-news-stage-49d8c87c.md); Account lead: a reply about work must read whether the person still has the job"
model: sonnet
effort: medium
root: none
---

**What.** At South Vienna, Ohio (3973796), world seed c1, new life Quinn Hale (born March 9, 1981), the player leaves their job at Randolph Building Services on January 20, 2025. On January 21 Melanie says "I heard you left Randolph Building Services. Good for you, Mom.", the player is offered "We'll see how work goes." and Melanie answers "Then make it count at work, Mom." The player has no work. Seen: after a job is left or lost, no reply or answer speaks of work there as ongoing.

**Cause.** Found in code: src/director/conversation.ts `playerNews` fills the same `employer` fact for a job got or changed (`jobOf`) and for a job lost or left (`lastEndedJob`), so a line that needs a job held (`conversation.player-news-answer-tell.we-ll-see-how-employer-goes-first`, `conversation.player-news-back-core.then-make-it-count-at-employer-you`) is filled from a job that ended.

**Fix.** A job that ended is its own fact (`former-employer`, cited to the ended job and its organization), and `employer` means a job the person holds. Lines that say the ended job by name ("I heard you left {employer}.") move to `former-employer` in the same change, by the Words lead; a reply about work there needs `employer`, so it is never offered after a job is left or lost. The words pull request for the player's news replies also stages the work reply for a job got or changed only.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Follow the standing rule "An effect is a read, not a record": a line about work reads whether the job is held from the jobs engine's record. No hand-written player text in code.

**Done when.** A second session, in a drawn place with its seed named, leaves the player's job and talks at home the next day; no reply or answer speaks of work there. Pinned: the South Vienna replay above (scripts/words/player-race-replay.ts or a test beside src/director/player-news-reply-stage.test.ts) offers no work reply after the job is left.

**Waits on.** nothing.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json
