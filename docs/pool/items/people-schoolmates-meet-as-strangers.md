---
id: people-schoolmates-meet-as-strangers
title: "Time at the same school in the same years writes no tie, so classmates meet as strangers"
area: people
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Played talks of the shared-school fix (Nov 15), Dortches, North Carolina, seed 7952d3f3e3253ee4
---

**What.** Two people the school records put at the same stage of one school in the same years have no tie and are not in each other's known people, so the game treats them as never having met. The schoolmate opens with "We haven't met. I'm Kimberly." or "New face. I'm Blair." and then asks "We were at Dortches Public Schools together, weren't we?"

Seen: in a talk with a schoolmate, the introduction a stranger gives, before the school question.

**Cause.** Measured: with a new life made at 45 (born May 12, 1979) at seed 7952d3f3e3253ee4 (Dortches, North Carolina). Talks with the player's schoolmates played through `/api/goto/visit` and `/api/talk/open`, as `src/director/shared-school-give-back.test.ts` plays them. For Blair, Julie, Rebekah and Paige, `relationFacts` (src/director/relation-facts.ts) gives `metBefore` false, and none holds the player in `knownIds`. `introduction()` (src/director/conversation.ts) calls someone a stranger unless `lastContact` finds a relationship row, they share a household or family, or `metBefore` holds. The school records are attendance spans only (`schoolSpans`, src/core2/past-school.ts). They write no relationship row and no known-person record, and nothing counts them as hours spent together. The opening peer network that put classmates in each other's circle was dropped (core-opening-peer-network-openingPeerGroupSize-as-cause).

**Fix.** Build on the rule already agreed for "have met": a relationship row, or a registered shared-hours reader. The lying thread is building `knownPeople` and `metThrough` in closeness.ts. School becomes one more shared-hours reader there: years at the same stage of one school, from `sharedHistory`'s schoolmate row, count as having met. It is not a second mechanism, and `introduction()` reads the same rule. Ties grown from hours together are people-shared-time-grows-ties. The student player's missing classmates are people-student-player-has-no-classmates-to-talk-to. The Words lead writes a schoolmate's opening lines once this is accepted.

**Time box.** 3 hours for one Opus session at medium effort, after the lying thread's `metThrough` lands.

**Rules.** One rule, all 56 places: read from each place's school records. No dice. One mechanism for "have met".

**Done when.** A second session, on main, plays the shared-school test's talks in a played world at a drawn place and seed, here 7952d3f3e3253ee4 (Dortches, North Carolina). No schoolmate the records put at the same stage in the same years says "We haven't met" or "New face", and the introduction reads `metThrough` for them.

**Waits on.** The lying thread's `knownPeople` and `metThrough` (closeness.ts).

**Files.** src/director/relation-facts.ts; src/director/conversation.ts; src/core2/shared-history.ts

**Notes.** Nov 15: filed by the "Let people bring up election results" thread on the Account lead's ruling.
