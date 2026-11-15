---
id: words-neighbor-asks-the-player-about-a-printed-story-by-its-medium
title: "A neighbor asks the player 'Did you hear about it?' of a printed story, and the player's answer names the outlet by its medium"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: words-outlet-names-keep-call-letters-and-say-their-kind
lead: words
model: sonnet
effort: medium
root: none
source: Second words reader on #9352, Nov 15; Words lead ruled the wordings in words-lead/outlet-ask/lines.md
checked: m3 2026-11-15
---

**What.** The player's answers "I heard that on {outlet}." (radio), "I saw that on {outlet}." (television), "I read it in {outlet} too." (paper) and the no-answers that ask "What happened?" are in the bank but no talk the game opens offers them for a printed story. A neighbor who read or heard a printed story only tells it ("I read about {about} yesterday. I'm for it, myself."), and the telling says "read" of a radio or television story. Seen: Creve Coeur, Illinois (seed pl5), six neighbors and three housemates with a radio story the player also heard, the player's choices were only why, for, against and "I'm Olivia".

**Cause.** Found in code: src/director/conversation.ts `raiseSubject` sets `composedRaise = "news-ask"` for a printed story (`subject.kind === "news" && subject.facts.story`), so the neighbor's raise is always the composed telling and never the ask; the ask pieces (`news-raise-heard`, "Did you hear about {topic}?") need {topic}, which only a closed-place subject carries (a printed story's facts are about, said and ran), so `wordConversationMove` returns no line for a printed story (played at pl5, Nov 15).

**Fix.** Let the neighbor open a printed story by asking when the player's own heard record shows the story reached the player (storiesHeard for the player): the ask is worded from the outlet's medium facts (outlet-paper, outlet-television, outlet-radio) with the seven wordings the Words lead ruled; the player's yes (only when the story reached the player, else the no) names the outlet by its medium, the no asks "What happened?" and the neighbor tells it; after either the neighbor says where they stand from their record. Say "heard", "read" or "saw" by the medium everywhere a line reads from an outlet, as one rule. Restore the two radio answer lines in the same change.

**Time box.** 4 hours.

**Rules.** No hand-written player text; one engine for the neighbor's raise; no scan in the test (named place and seeds).

**Done when.** In the played world at a drawn place, Creve Coeur, Illinois (seed pl5), a second session opens a talk where a neighbor asks about a radio story the player heard, sees "I heard that on WAYC." offered with "I saw that." absent, presses it, and reads the neighbor's stand; and the same for a story the player did not hear (the "What happened?" answered).

**Waits on.** The #9352 fold.

**Files.** src/director/conversation.ts,data/english/parts/conversation.json,src/director/data/conversation-rules.json,src/director/outlet-ask-talk.test.ts (new)
