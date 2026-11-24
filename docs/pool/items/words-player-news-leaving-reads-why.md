---
id: words-player-news-leaving-reads-why
title: "A housemate greets every job the player leaves as good news, whatever the reason"
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
source: "Second reader's stamp on #9567, Nov 15, 2026 (/mnt/project-files/words-lead/played-talks/lines-player-news-stage-49d8c87c.md); Account lead: the leaving line must read why they left"
model: sonnet
effort: medium
root: none
---

**What.** At South Vienna, Ohio (3973796), world seed c1, new life Quinn Hale (born March 9, 1981), the player leaves their job on January 20, 2025, and Melanie says "I heard you left Randolph Building Services. Good for you, Mom." and, after the player's thanks, "You earned it, Mom." The same lines follow any leaving, whatever made the player leave. Seen: a housemate's line about a job left says how they take it from why the player left, and says nothing glad when the reason gives no cause for it.

**Cause.** Found in code: src/director/conversation.ts `playerNews` reads the job change's kind (`job-left`) and the speaker's stance from their tie and caution, never the change's own reason (`reasonKey` on the jobs engine's change record, src/core2/modules/jobs.ts), so the "good" group of stances is used for every leaving.

**Fix.** `playerNews` carries the change's reason as a fact (`left-why-<reason>`, cited to the change record), and the stance group for a job left reads it: a reason that brings the player something better (a better job, a move they chose) is good news; one that does not (pay cut, hours, a fall-out) is not. The Words lead stages the say, closer and back lines by those facts.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Follow the standing rule "No dice": the line follows the recorded reason and the speaker's tie, never a roll. No hand-written player text in code.

**Done when.** A second session, in a drawn place with its seed named, leaves the player's job for a reason the Work menu records and talks at home the next day; the housemate's line fits that reason. Pinned at South Vienna, Ohio, seed c1.

**Waits on.** words-player-news-work-reply-reads-the-job-held (same function, same lines).

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json
