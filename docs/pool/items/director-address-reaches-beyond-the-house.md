---
id: director-address-reaches-beyond-the-house
title: "People outside the player's house hold the President's address on record, from watching it or hearing of it"
area: director
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-address-reaches-beyond-the-house
pr: 10137
after:
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: CTO, Nov 18 13:15Z on the Story thread (issue 9750), pattern A47 "The first word on the address" (docs/story/scene-patterns.json): the speaker can be a neighbor, a coworker the next morning, a regular where people gather, a party officer, and the gate is that they hold the address on record, "having watched it or heard of it from someone or the news"
checked:
---

**What.** A47 lets anyone around the player bring up the President's address within a week: a coworker the next morning, the diner counter, a neighbor. Today only the player's household can, because nobody else holds the address on record. So a player who lives alone hears nothing about it, and the talk at work the next day never mentions it. Seen: the talks at work and in town in the first week of a new life.

**Cause.** Measured: in two drawn worlds on Nov 18 (Lancaster NH, key 3340340; Unionville MI, key 2681420; probe seed reach-a), on days 0, 1, 3 and 7 after the address, the only person outside the player's household holding `address:event` was the President. `recordOpeningStory` in `src/director/opening-story.ts` names the player and the household as the event's only witnesses, and no reader of a printed or broadcast story about the address is given its record.

**Fix.** Give the address record to the full people who would have it, through the engines that already decide what people see and hear, no viewer roll. (1) Watching live: each full person's own engagement in politics (the views engine's engagement against its survey cell) and whether their household was home at the airing hour decide who watched, calibrated so the town's share of watchers sits near the national audience (research the inaugural audience, for example Nielsen's counts for 2021 and 2025, as a SOURCED parameter with its spread). (2) Hearing of it: a person who reads or hears a story about the address (the press desk's readers of that story) learns the address from that story, citing it. (3) Word of mouth: a person who talks with someone who holds it may learn it through the conversation's existing told record. Each keeps the source record as `address:event`'s source, so a talk can say how they heard it.

**Time box.** 4 hours.

**Rules.** No dice: who watched follows their traits and the household's evening, calibrated to the real audience, never a per-person chance. One engine: the press desk and the conversation's told record, no second news system. The counted population reads the same rule times its count.

**Done when.** A second session, in a played opening at a drawn place, a coworker on day 1 and a regular at a gathering place within the week hold the address on record, cite how they learned it (watched, a story by record id, or a talk), and raise its point to the player; the dev mode Trace names the source record.

**Waits on.** Nothing.

**Files.** src/director/opening-story.ts, src/director/conversation.ts, src/core2/press-desk.ts

**Notes.** Nov 18 (Story): filed from the reach probe for A47. Nov 18 (Story engine helper, branch claude/story-address-reaches-beyond-the-house): watched live built (src/director/address-audience.ts, the press's habit order against Nielsen's share, households home at the hour, and people filled in during the address's weeks read by the same cut); the printed story already teaches the address (it prints on the first press week, day 14 in Lancaster NH, and reaches readers from day 15); word of mouth from people who watched it is not built (the news engine passes only printed stories at contacts, and the talk's told record teaches only a speaker's own facts). Later the same day (Story lead's follow-up): word of mouth built through the news engine's contacts (`heardOnAir` in news.ts makes the watched address a story its watchers tell at real contacts, sourced to the relationship), and a fact a person perceived first-hand is no longer replaced by a story or a national story's reading of the same fact.
