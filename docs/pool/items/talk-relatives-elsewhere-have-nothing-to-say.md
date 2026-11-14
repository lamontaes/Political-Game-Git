---
id: talk-relatives-elsewhere-have-nothing-to-say
title: "Relatives who live elsewhere often have no talk, so the player cannot call them"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead, Nov 14, 2026, from the Words lead's ruling on #9171: a Call that cannot open is not shown"
model: opus
effort: medium
root: rc3-thin-life-record
checked: account lead 2026-11-14
---

**What.** On a person's card, Call is offered only when a talk with that person has a line. Many relatives who live outside the town have none, so a player cannot call a close daughter or brother even though the game says they are close. Seen: a drawn world on seed bc2bb661-a9c3-4b23-86ff-ce3e173e38ff (Quonochontaug, Rhode Island): a daughter, a brother and three grandsons living elsewhere offered no Call; at the fixed seed `person-acts-1` of src/bench/person-acts.test.ts, three of five relatives elsewhere had no line and two had two.

**Cause.** Found in code: `openConversation` (src/director/conversation.ts) opens with a greeting (`greetingLine`) or a raised subject; for relatives of the husk tier (`livesElsewhere`, src/core2/modules/moves.ts) that the player does not yet know, neither produces a line for some people, and the conversation's subjects (`subjectsBetween`) read little about a person who is not in the town. The cause for each missing line (which bank piece or subject is withheld) is not yet traced.

**Fix.** Trace per relative which piece is withheld, then give a relative elsewhere the talk a phone call between kin would have (how they are, news from their own record through the lives engine), through the conversation engine and the lives work (skill `lives`). No stopgap, no dice: what they say comes from their records.

**Time box.** 4 hours, Opus at medium effort. When it runs out, push what passes, set the state honestly and stop.

**Rules.** One engine per mechanic: the talk comes from the one conversation engine, never a second talk system. No dice: what a relative says is read from their records. No hand-written player text in code: any line comes from the English engine banks, written by the Words lead.

**Done when.** A second session, in a drawn place with its seed named, opens the card of a close relative who lives elsewhere and sees Call, presses it and reads a talk that opens by phone from that relative's own records.

**Waits on.** `player-visits-or-calls-from-the-card` (the Call button) and the Words lead's by-phone openers.

**Files.** src/director/conversation.ts, src/core2/modules/kin-contact.ts
