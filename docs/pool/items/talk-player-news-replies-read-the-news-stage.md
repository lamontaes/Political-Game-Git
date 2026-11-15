---
id: talk-player-news-replies-read-the-news-stage
title: "Replies to the player's own news are read at the raise's stage, not the news's"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/project-thread-5efbu8
pr:
after:
blocked-on:
lead: words
source: "Election results thread, Nov 15, 2026: found while staging the player-news replies (words-player-news-replies-ignore-the-race-result); split out by the Account lead"
model: sonnet
effort: medium
root: none
---

**What.** Once the player-news replies carry stages (a race filed, won or lost; a job got, lost or left), a housemate who raises the player's news has nothing offered back, and the talk opens empty. Seen at South Vienna, Ohio (3973796), world seed c1, new life Quinn Hale (born March 9, 1981): the player leaves their job on January 20, 2025, and on January 21 Melanie's talk opens with no line when the replies are staged "job-left". Seen: the replies that fit what the news was are offered.

**Cause.** Found in code: src/director/conversation.ts `playerFacts` sets the replies' stage from the last line's stage. A player-news line is raised at the static `otherRaises` stage ("default"), the same for every piece of the player's news, so a reply staged by what the news was never matches (grounded-english keeps a variant only when its stages hold the packet's stage).

**Fix.** In `playerFacts`, a player-news line's replies read the subject's own stage (`last.subject.stage`: filed, won, lost, in-paper, job-got, job-changed, job-lost, job-left).

**Time box.** 1 hour for one Sonnet session.

**Rules.** No dice: the replies offered follow the record of what the player's news was. No new lines: the reply rows come from the words pull request.

**Done when.** src/director/player-news-reply-stage.test.ts (South Vienna OH, seed c1, the shipped data with the player-news replies staged "job-left", the row the words pull request ships) fails without the change and passes with it; a second session, in a drawn place with its seed named, sees a staged reply offered after the player's news in a played talk once the words pull request is in.

**Waits on.** nothing.

**Files.** src/director/conversation.ts, src/director/player-news-reply-stage.test.ts (new)
